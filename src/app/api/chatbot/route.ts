
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

// Define the full structure of the policy JSON data for TypeScript
interface PolicyCondition {
  in_person_only?: boolean;
  include_day_passes?: boolean;
  include_corporate_partner_passes?: boolean;
  online_allowed?: boolean;
  exclude_apparel_rental?: boolean;
  exclude_wearable_tech?: boolean;
  include_security_deposit_if_nonrefundable?: boolean;
  security_deposit_note?: string;
}

interface PolicyCategory {
  id: number;
  key: string;
  name: string;
  allowed: boolean;
  conditions?: PolicyCondition;
  examples_included: string[];
  examples_excluded: string[];
}

interface NotAllowedItem {
  id: number;
  key: string;
  name: string;
  allowed: boolean;
  examples: string[];
  reason: string;
}

interface PolicyResponses {
  APPROVE_ROUTE: string;
  REJECT_OUTSIDE_SCOPE: string;
  REJECT_RECEIPT_NAME: string;
  REJECT_YEAR: string;
  REJECT_ONLINE_ONLY: string;
  ESCALATE_CASE_BY_CASE: string;
}

interface PolicyData {
  policy_name: string;
  version: string;
  generated_at: string;
  jurisdiction: string;
  currency: string;
  scope_note: string;
  eligibility: { employees_only: boolean };
  claim_year_rule: { id: string; description: string; enforcement: string };
  receipt_rule: { id: string; description: string; accepted_formats: string[]; required_fields_hint: string[]; fallback_note: string };
  approval: { auto_approve: boolean; route_to: string[]; tone: string };
  categories: PolicyCategory[];
  not_allowed: NotAllowedItem[];
  matching: { synonyms: { [key: string]: string[] } };
  decision_flow: { order: number; action: string }[];
  responses: PolicyResponses;
  default_behavior: { deny_if_not_in_allowed: boolean; notes: string };
}

// Levenshtein distance function for string similarity
function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;

  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix: number[][] = [];

  for (let i = 0; i <= an; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= bn; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[an][bn];
}

// Helper function for fuzzy matching with a threshold
function isSimilar(query: string, target: string, threshold: number = 0.4): boolean {
  const distance = levenshteinDistance(query, target);
  const maxLength = Math.max(query.length, target.length);
  if (maxLength === 0) return true; // Both empty strings are similar
  return (1 - distance / maxLength) > threshold;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userQuery: string = body.item?.toLowerCase().trim() || '';

    if (!userQuery) {
      return NextResponse.json({ error: 'No item provided' }, { status: 400 });
    }

    const jsonPath = path.join(process.cwd(), 'public', 'HR_Sports_Benefits_policy.json');
    const jsonData = await fs.readFile(jsonPath, 'utf-8');
    const policy: PolicyData = JSON.parse(jsonData);

    let responseMessage = policy.responses.REJECT_OUTSIDE_SCOPE;
    let isClaimable = false;
    let matchedCategoryName: string | undefined;
    const suggestions: Set<string> = new Set();

    // 1. Check against allowed categories and their synonyms/examples
    for (const category of policy.categories) {
      if (category.allowed) {
        // Check examples_included
        for (const example of category.examples_included) {
          if (userQuery.includes(example.toLowerCase()) || isSimilar(userQuery, example.toLowerCase(), 0.7)) {
            isClaimable = true;
            matchedCategoryName = category.name;
            break;
          }
        }

        // Check synonyms
        if (!isClaimable && policy.matching.synonyms[category.key]) {
          for (const synonym of policy.matching.synonyms[category.key]) {
            if (userQuery.includes(synonym.toLowerCase()) || isSimilar(userQuery, synonym.toLowerCase(), 0.7)) {
              isClaimable = true;
              matchedCategoryName = category.name;
              break;
            }
          }
        }

        // If a match is found in included/synonyms, check against category's excluded examples
        if (isClaimable) {
          for (const excludedExample of category.examples_excluded) {
            if (userQuery.includes(excludedExample.toLowerCase()) || isSimilar(userQuery, excludedExample.toLowerCase(), 0.7)) {
              isClaimable = false; // It was included, but then explicitly excluded within the category
              responseMessage = policy.responses.REJECT_OUTSIDE_SCOPE; // Or a more specific message if available
              break;
            }
          }
        }
      }
      if (isClaimable) break; // Found a claimable item, no need to check other categories
    }

    // 2. If not claimable yet, check against explicitly not_allowed items
    if (!isClaimable) {
      for (const notAllowedItem of policy.not_allowed) {
        for (const example of notAllowedItem.examples) {
          if (userQuery.includes(example.toLowerCase()) || isSimilar(userQuery, example.toLowerCase(), 0.7)) {
            responseMessage = notAllowedItem.reason;
            break;
          }
        }
        if (responseMessage !== policy.responses.REJECT_OUTSIDE_SCOPE) break; // Found a specific reason
      }
    }

    // 3. Apply conditions (simplified for now, more complex conditions would need more logic)
    if (isClaimable && matchedCategoryName) {
        const category = policy.categories.find(cat => cat.name === matchedCategoryName);
        if (category?.conditions?.in_person_only && userQuery.includes('online')) {
            isClaimable = false;
            responseMessage = policy.responses.REJECT_ONLINE_ONLY;
        }
    }

    // 4. If still not claimable, look for suggestions
    if (!isClaimable && responseMessage === policy.responses.REJECT_OUTSIDE_SCOPE) {
        const allPossibleItems: string[] = [];
        policy.categories.forEach(cat => {
            if (cat.allowed) {
                allPossibleItems.push(...cat.examples_included);
                if (policy.matching.synonyms[cat.key]) {
                    allPossibleItems.push(...policy.matching.synonyms[cat.key]);
                }
            }
        });

        for (const item of allPossibleItems) {
            if (isSimilar(userQuery, item.toLowerCase(), 0.6)) { // Lower threshold for suggestions
                suggestions.add(item);
            }
        }

        if (suggestions.size > 0) {
            responseMessage = `This item isn't directly listed. Did you mean: ${Array.from(suggestions).join(', ')}?`;
        }
    }

    // Final response construction
    if (isClaimable && matchedCategoryName) {
      responseMessage = policy.responses.APPROVE_ROUTE.replace('{category}', matchedCategoryName);
    } else if (responseMessage === policy.responses.REJECT_OUTSIDE_SCOPE && policy.default_behavior.deny_if_not_in_allowed) {
        // If still generic reject and default behavior is to deny if not explicitly allowed
        responseMessage = policy.responses.REJECT_OUTSIDE_SCOPE; // Keep generic reject
    }

    return NextResponse.json({ isClaimable, responseMessage });

  } catch (error) {
    console.error('Chatbot API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
