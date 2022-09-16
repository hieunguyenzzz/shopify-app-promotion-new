import { Shopify } from "@shopify/shopify-api";

export const PRODUCT_VARIANT_PRICE_QUERY = `
  query ($id: ID!,) {
      productVariant (id:$id) {
          id
          title
          displayName
          product {
            title
          }
          image {
            url
          }
          sku
          price
          compareAtPrice
      }
  }
`;
export default async function variantGet(session, req) {
  const client = new Shopify.Clients.Graphql(session.shop, session.accessToken);
  try {
    console.log({ req: req.body });
    let result = await client.query({
      data: {
        query: PRODUCT_VARIANT_PRICE_QUERY,
        variables: {
          id: req.body.id,
        },
      },
    });
    return result;
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
