import { Shopify } from "@shopify/shopify-api";
const NAMESPACE = "promoitem";
const DATA = "data";
const PROMO_METAFIELDS_QUERY = `
{
  shop {
    id
    metafields(namespace: "${NAMESPACE}", first: 250) {
      edges{
        node{
          id
          namespace
          key
          type
          value
        }
      }
    }
  }
}
`;

export default async function promoGet(session) {
  const client = new Shopify.Clients.Graphql(session.shop, session.accessToken);

  try {
    return await client.query({
      data: {
        query: PROMO_METAFIELDS_QUERY,
      },
    });
  } catch (error) {
    if (error.message) {
      throw new Error(
        `${error.message}\n${JSON.stringify(error.response, null, 2)}`
      );
    } else {
      throw error;
    }
  }
}
