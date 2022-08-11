import { Shopify } from "@shopify/shopify-api";
const NAMESPACE = "promoitem";
const DATA = "data";
const PROMO_METAFIELDS_MUTATION = `
mutation setMetafield($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      namespace
      id
      key
      value
    }
    userErrors {
      code
      message
    }
  }
}
`;

export default async function promoCreate(session, req) {
  const client = new Shopify.Clients.Graphql(session.shop, session.accessToken);

  try {
    return await client.query({
      data: {
        query: PROMO_METAFIELDS_MUTATION,
        variables: {
          metafields: [
            {
              key: NAMESPACE + "_" + Date.now(),
              namespace: NAMESPACE,
              ownerId: req.query.shopId,
              type: "multi_line_text_field",
              value: "{}",
            },
          ],
        },
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
