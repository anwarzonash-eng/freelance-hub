import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { gql } from '@apollo/client';

const httpLink = createHttpLink({
    uri: 'https://api.upwork.com/graphql',
});

const authLink = setContext((_, { headers }) => {
    // Replace YOUR_ACCESS_TOKEN with your actual Freelance Platform API access token
    const token = process.env.NEXT_PUBLIC_JOB_API_TOKEN;
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : '',
        }
    };
});

const client = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
});

const JOB_POSTINGS_SEARCH_QUERY = gql`
  query marketplaceJobPostingsSearch(
    $marketPlaceJobFilter: MarketplaceJobPostingsSearchFilter,
    $searchType: MarketplaceJobPostingSearchType,
    $sortAttributes: [MarketplaceJobPostingSearchSortAttribute]
  ) {
    marketplaceJobPostingsSearch(
      marketPlaceJobFilter: $marketPlaceJobFilter,
      searchType: $searchType,
      sortAttributes: $sortAttributes
    ) {
      totalCount
      edges {
        cursor
        node {
          id
          title
          ciphertext
          duration
          durationLabel
          engagement
          amount {
            rawValue
            currency
            displayValue
          }
          recordNumber
          experienceLevel
          category
          subcategory
          freelancersToHire
          relevance {
            id
            effectiveCandidates
            recommendedEffectiveCandidates
            uniqueImpressions
            publishTime
            hoursInactive
          }
          enterprise
          relevanceEncoded
          totalApplicants
          preferredFreelancerLocation
          preferredFreelancerLocationMandatory
          premium
          clientNotSureFields
          clientPrivateFields
          applied
          createdDateTime
          publishedDateTime
          renewedDateTime
          client {
            totalHires
            totalPostedJobs
            totalSpent {
              rawValue
              currency
              displayValue
            }
            verificationStatus
            location {
              city
              country
              timezone
              state
              offsetToUTC
            }
            totalReviews
            totalFeedback
            companyRid
            edcUserId
            lastContractPlatform
            lastContractRid
            lastContractTitle
            hasFinancialPrivacy
          }
          skills {
            name
            prettyName
            highlighted
          }
          occupations {
            category {
              id
              prefLabel
            }
            subCategories {
              id
              prefLabel
            }
            occupationService {
              id
              prefLabel
            }
          }
          hourlyBudgetType
          hourlyBudgetMin {
            rawValue
            currency
            displayValue
          }
          hourlyBudgetMax {
            rawValue
            currency
            displayValue
          }
          localJobUserDistance
          weeklyBudget {
            rawValue
            currency
            displayValue
          }
          engagementDuration {
            id
            label
            weeks
          }
          totalFreelancersToHire
          teamId
          freelancerClientRelation {
            companyRid
            companyName
            edcUserId
            lastContractPlatform
            lastContractRid
            lastContractTitle
          }
        }
      }
    }
  }
`;