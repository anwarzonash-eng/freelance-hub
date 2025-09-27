
import { NextResponse } from "next/server";

// export async function GET() {
//     try {
//         const csvFilePath = path.join(process.cwd(), "data", "completed_jobs_embeddings.csv");
//         console.log(csvFilePath);


//         const fileContent = fs.readFileSync(csvFilePath, "utf-8");

//         const records = parse(fileContent, {
//             columns: true, // Use first row as header
//             skip_empty_lines: true,
//         });

//         return NextResponse.json(records);
//     } catch (error) {
//         console.error(error);
//         return NextResponse.json({ error: "Failed to read CSV file" }, { status: 500 });
//     }
// }

export async function GET() {
    try {
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("Authorization", "bearer oauth2v2_REDACTED");


        const graphql = JSON.stringify({
            query: "query marketplaceJobPostingsSearch(\r\n  $marketPlaceJobFilter: MarketplaceJobPostingsSearchFilter,\r\n  $searchType: MarketplaceJobPostingSearchType,\r\n  $sortAttributes: [MarketplaceJobPostingSearchSortAttribute]\r\n) {\r\n  marketplaceJobPostingsSearch(\r\n    marketPlaceJobFilter: $marketPlaceJobFilter,\r\n    searchType: $searchType,\r\n    sortAttributes: $sortAttributes\r\n  ) {\r\n    totalCount,\r\n    edges {\r\n        cursor,\r\n        node {\r\n            id,\r\n            title,\r\n            description,\r\n            ciphertext,\r\n            duration,\r\n            durationLabel,\r\n            engagement,\r\n            amount {\r\n                rawValue\r\n                currency\r\n                displayValue\r\n                },\r\n            recordNumber,\r\n            experienceLevel,\r\n            category,\r\n            subcategory,\r\n            freelancersToHire,\r\n            relevance \r\n            {\r\n                id\r\n                effectiveCandidates\r\n                recommendedEffectiveCandidates\r\n                uniqueImpressions\r\n                publishTime\r\n                hoursInactive\r\n            },\r\n            enterprise\r\n            relevanceEncoded\r\n            totalApplicants\r\n            preferredFreelancerLocation\r\n            preferredFreelancerLocationMandatory\r\n            premium\r\n            clientNotSureFields\r\n            clientPrivateFields\r\n            applied\r\n            createdDateTime\r\n            publishedDateTime\r\n            renewedDateTime\r\n            client {\r\n                totalHires\r\n                totalPostedJobs\r\n                totalSpent                     \r\n                {\r\n                    rawValue\r\n                    currency\r\n                    displayValue\r\n                }\r\n                verificationStatus\r\n                location {\r\n                    city\r\n                    country\r\n                    timezone\r\n                    state\r\n                    offsetToUTC\r\n                    }\r\n                totalReviews\r\n                totalFeedback\r\n                companyRid\r\n                edcUserId\r\n                lastContractPlatform\r\n                lastContractRid\r\n                lastContractTitle\r\n                #companyOrgUid\r\n                hasFinancialPrivacy\r\n                }\r\n            skills \r\n            {name\r\nprettyName\r\nhighlighted}\r\n            occupations{\r\n                category {id\r\nprefLabel}\r\nsubCategories {id\r\nprefLabel}\r\noccupationService {id\r\nprefLabel}\r\n            }\r\n            hourlyBudgetType\r\n            hourlyBudgetMin {\r\n                    rawValue\r\n                    currency\r\n                    displayValue\r\n                }\r\n            hourlyBudgetMax {\r\n                    rawValue\r\n                    currency\r\n                    displayValue\r\n                }\r\n            localJobUserDistance\r\n            weeklyBudget {\r\n                    rawValue\r\n                    currency\r\n                    displayValue\r\n                }\r\n            engagementDuration {id\r\nlabel\r\n\r\nweeks}\r\n            totalFreelancersToHire\r\n            teamId\r\n            freelancerClientRelation {companyRid\r\ncompanyName\r\nedcUserId\r\nlastContractPlatform\r\nlastContractRid\r\nlastContractTitle}\r\n        }\r\n    \r\n    }\r\n    \r\n  }\r\n}",
            variables: { "MarketplaceJobPostingsSearchFilter": {}, "searchType": "USER_JOBS_SEARCH", "sortAttributes": { "field": "RECENCY" } }
        })
        const requestOptions: any = {
            method: "POST",
            headers: myHeaders,
            body: graphql,
            redirect: "follow"
        };

        const response = await fetch("https://api.upwork.com/graphql", requestOptions)

        return NextResponse.json(await response.json());
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to etch upwork jobs" }, { status: 500 });
    }
}
