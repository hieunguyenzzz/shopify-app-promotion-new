import { Shopify } from "@shopify/shopify-api";

export const UPDATE_PRODUCT_VARIANT_PRICE_MUTATION = `
  mutation ($id: ID!, $price: Money,$compareAtPrice: Money) {
    productVariantUpdate(input: { id: $id, price: $price, compareAtPrice: $compareAtPrice }) {
      productVariant {
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
  }
`;
export default async function variantPriceUpdate(session, req) {
  const client = new Shopify.Clients.Graphql(session.shop, session.accessToken);
  try {
    console.log({ req: req.body });
    let result = await client.query({
      data: {
        query: UPDATE_PRODUCT_VARIANT_PRICE_MUTATION,
        variables: {
          id: req.body.id,
          price: req.body.price,
          compareAtPrice: req.body.compareAtPrice,
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
