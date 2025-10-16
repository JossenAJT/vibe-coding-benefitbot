
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

// Define the structure of the policy JSON data for TypeScript
interface PolicyCategory {
  id: number;
  key: string;
  name: string;
  allowed: boolean;
  examples_included: string[];
  examples_excluded: string[];
}

interface PolicyData {
  categories: PolicyCategory[];
  not_allowed: { name: string; examples: string[]; reason: string }[];
  responses: {
    APPROVE_ROUTE: string;
    REJECT_OUTSIDE_SCOPE: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    // 1. Read the user's query
    const body = await req.json();
    const userQuery: string = body.item?.toLowerCase() || '';

    if (!userQuery) {
      return NextResponse.json({ error: 'No item provided' }, { status: 400 });
    }

    // 2. Load the policy data
    const jsonPath = path.join(process.cwd(), 'public', 'HR_Sports_Benefits_policy.json');
    const jsonData = await fs.readFile(jsonPath, 'utf-8');
    const policy: PolicyData = JSON.parse(jsonData);

    let responseMessage = policy.responses.REJECT_OUTSIDE_SCOPE;
    let isClaimable = false;

    // 3. Simple matching logic
    // Check in allowed categories
    for (const category of policy.categories) {
      if (category.allowed) {
        for (const example of category.examples_included) {
          if (example.toLowerCase().includes(userQuery)) {
            isClaimable = true;
            responseMessage = policy.responses.APPROVE_ROUTE.replace('{category}', category.name);
            break;
          }
        }
      }
      if (isClaimable) break;
    }

    // Check in explicitly not allowed items
    if (!isClaimable) {
        for (const notAllowedItem of policy.not_allowed) {
            for (const example of notAllowedItem.examples) {
                if (example.toLowerCase().includes(userQuery)) {
                    responseMessage = notAllowedItem.reason;
                    break;
                }
            }
        }
    }


    // 4. Return the response
    return NextResponse.json({ isClaimable, responseMessage });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
