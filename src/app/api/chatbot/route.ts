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

// Helper function for fuzzy matching (can be improved with more advanced NLP)
function fuzzyMatch(query: string, target: string): boolean {
  return target.toLowerCase().includes(query.toLowerCase());
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

    // 1. Check against allowed categories and their synonyms/examples
    for (const category of policy.categories) {
      if (category.allowed) {
        // Check examples_included
        for (const example of category.examples_included) {
          if (fuzzyMatch(userQuery, example)) {
            isClaimable = true;
            matchedCategoryName = category.name;
            break;
          }
        }

        // Check synonyms
        if (!isClaimable && policy.matching.synonyms[category.key]) {
          for (const synonym of policy.matching.synonyms[category.key]) {
            if (fuzzyMatch(userQuery, synonym)) {
              isClaimable = true;
              matchedCategoryName = category.name;
              break;
            }
          }
        }

        // If a match is found in included/synonyms, check against category's excluded examples
        if (isClaimable) {
          for (const excludedExample of category.examples_excluded) {
            if (fuzzyMatch(userQuery, excludedExample)) {
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
          if (fuzzyMatch(userQuery, example)) {
            responseMessage = notAllowedItem.reason;
            break;
          }
        }
        if (responseMessage !== policy.responses.REJECT_OUTSIDE_SCOPE) break; // Found a specific reason
      }
    }

    // 3. Apply conditions (simplified for now, more complex conditions would need more logic)
    // For example, if a category has 'in_person_only: true' and the query implies online, reject.
    // This part would require more advanced NLP to infer 'online' vs 'in-person' from userQuery.
    // For now, we'll just use the REJECT_ONLINE_ONLY if a category explicitly disallows online and the query implies it.
    if (isClaimable && matchedCategoryName) {
        const category = policy.categories.find(cat => cat.name === matchedCategoryName);
        if (category?.conditions?.in_person_only && userQuery.includes('online')) {
            isClaimable = false;
            responseMessage = policy.responses.REJECT_ONLINE_ONLY;
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