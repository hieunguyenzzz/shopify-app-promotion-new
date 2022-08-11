import { Shopify } from "@shopify/shopify-api";

const PRODUCTS_BY_COLLECTION_FIRST_GET_QUERY = `
query get_products_first($id:ID!){
  collection(id:$id){
    title
    products(first:250){
      pageInfo{
        endCursor
        hasNextPage
      }
      edges{
        node{
          title
          id
        }
      }
    }
  }
}
`;
const PRODUCTS_BY_COLLECTION_MORE_GET_QUERY = `query get_products_more($id:ID!,$after:String){
  collection(id:$id){
    title
    products(first:250,after:$after){
      pageInfo{
        endCursor
        hasNextPage
      }
      edges{
        node{
          title
          id
        }
      }
    }
  }
}`;
export default async function productsByColectionGet(session, req) {
  const client = new Shopify.Clients.Graphql(session.shop, session.accessToken);
  try {
    const collectionId = req.query.collectionId;
    let result = [];
    let data = await client.query({
      data: {
        query: PRODUCTS_BY_COLLECTION_FIRST_GET_QUERY,
        variables: {
          id: collectionId,
        },
      },
    });
    result.push(data?.body?.data?.collection?.products?.edges);
    console.log(
      "data?.data?.collection?.products?.pageInfo",
      collectionId,
      data?.body?.data?.collection?.products?.pageInfo
    );
    while (data?.body?.data?.collection?.products?.pageInfo?.hasNextPage) {
      data = await client.query({
        data: {
          query: PRODUCTS_BY_COLLECTION_MORE_GET_QUERY,
          variables: {
            id: collectionId,
            after: data?.body?.data.collection.products.pageInfo.endCursor,
          },
        },
      });
      result.push(data?.body?.data?.collection?.products?.edges);
    }
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
