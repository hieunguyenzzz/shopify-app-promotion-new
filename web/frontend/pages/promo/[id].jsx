import {
  ContextualSaveBar,
  ResourcePicker,
  TitleBar,
} from "@shopify/app-bridge-react";
import {
  Button,
  ButtonGroup,
  Card,
  EmptyState,
  Form,
  FormLayout,
  Layout,
  List,
  Modal,
  Page,
  ResourceItem,
  ResourceList,
  Spinner,
  Stack,
  TextField,
  TextStyle,
  Thumbnail,
} from "@shopify/polaris";
import { notEmptyString, useField, useForm } from "@shopify/react-form";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppQuery, useAuthenticatedFetch } from "../../hooks";
const ResourceType = {
  Product: "Product",
  Collection: "Collection",
};
export default function PromoEdit() {
  const { data } = useAppQuery({
    url: "/api/promo/get",
    reactQueryOptions: {},
  });
  const shopId = data?.body?.data?.shop?.id;
  const { id } = useParams();
  const promotion = data?.body?.data?.shop?.metafields?.edges?.filter(
    (item) => item.node.key === id
  )[0]?.node;
  const [resourceType, setResourceType] = useState(ResourceType.Collection);
  const [products, setProducts] = useState();
  const fetch = useAuthenticatedFetch();
  const breadcrumbs = [{ content: "Promotion", url: "/" }];
  const [showResourcePicker, setShowResourcePicker] = useState(false);
  const onSubmit = useCallback(async (body) => {
    const parsedBody = body;
    parsedBody.key = id;
    console.log({ parsedBody });
    /* use (authenticated) fetch from App Bridge to send the request to the API and, if successful, clear the form to reset the ContextualSaveBar and parse the response JSON */
    const response = await fetch(`/api/promo/update?shopId=${shopId}`, {
      method: "POST",
      body: JSON.stringify(parsedBody),
      headers: { "Content-Type": "application/json" },
    });
    if (response.ok) {
      const result = await response.json();
      return { status: "success" };
    }
    return { status: "fail" };
  }, []);
  const {
    fields: { title, percentage },
    dirty,
    reset,
    submitting,
    submit,
    makeClean,
  } = useForm({
    fields: {
      title: useField({
        value: "New promotion",
        validates: [notEmptyString("Please enter a title")],
      }),
      percentage: useField({
        value: 0,
        validates: [notEmptyString("Please enter a percentage")],
      }),
    },
    onSubmit,
    makeCleanAfterSubmit: true,
  });
  console.log({ title });
  useEffect(() => {
    try {
      if (promotion) {
        const parsedValue = JSON.parse(promotion.value);
        console.log({ promotion, parsedValue });
        title.newDefaultValue(parsedValue.title);
        percentage.newDefaultValue(parsedValue.percentage);
      }
    } catch (error) {
      console.error(error);
    }
  }, [promotion]);

  const toggleResourcePicker = useCallback(
    () => setShowResourcePicker(!showResourcePicker),
    [showResourcePicker]
  );

  const items = (products?.selection || []).flatMap(
    ({ variants, ...product }) =>
      variants.map((variant) => ({ ...variant, product }))
  );
  const [selected, setSelected] = useState([]);
  const [process, setProcess] = useState({});
  const [current, setCurrent] = useState(0);
  async function updateAllPrice(start = 0, items) {
    let current = start;
    while (current < items.length) {
      setCurrent(current + 1);
      let currentItem = items[current];
      const { compareAtPrice, id } = currentItem;
      let oldPrice = compareAtPrice;
      let newPrice = (
        ((100 - Number(percentage.value)) * Number(compareAtPrice)) /
        100
      ).toFixed(2);
      let promiseData = fetch(`/api/variant-price-update`, {
        method: "POST",
        body: JSON.stringify({
          id: id,
          price: newPrice,
          compareAtPrice: oldPrice,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      setProcess({
        ...process,
        [id]: promiseData,
      });
      let result = await promiseData.then((res) => res.json());
      current++;
      setProcess({
        ...process,
        [id]: result,
      });
    }
    setCurrent(0);
  }
  return (
    <Page fullWidth>
      <TitleBar
        title="Edit promotion"
        breadcrumbs={breadcrumbs}
        primaryAction={null}
      />
      <Layout>
        <Layout.Section>
          <Form>
            <ContextualSaveBar
              saveAction={{
                label: "Save",
                onAction: submit,
                loading: submitting,
                disabled: submitting,
              }}
              discardAction={{
                label: "Discard",
                onAction: reset,
                loading: submitting,
                disabled: submitting,
              }}
              visible={dirty}
              fullWidth
            />
            <FormLayout>
              <Card sectioned>
                <TextField
                  {...title}
                  requiredIndicator
                  label="Title"
                  helpText="Only store staff can see this title"
                />
              </Card>
              <Card sectioned title="Set discount method and amount">
                <TextField
                  {...percentage}
                  requiredIndicator
                  label="Percentage"
                  type="number"
                  min={0}
                  max={100}
                  prefix="%"
                />
              </Card>
              <Card
                title="Products"
                actions={[
                  {
                    content: "Select products",
                    onAction: () => setShowResourcePicker(!showResourcePicker),
                  },
                ]}
              >
                <Card.Section>
                  <ButtonGroup segmented>
                    <Button
                      primary={ResourceType.Collection === resourceType}
                      onClick={() => {
                        setResourceType(ResourceType.Collection);
                      }}
                    >
                      {ResourceType.Collection}
                    </Button>
                    <Button
                      primary={ResourceType.Product === resourceType}
                      onClick={() => {
                        setResourceType(ResourceType.Product);
                      }}
                    >
                      {ResourceType.Product}
                    </Button>
                  </ButtonGroup>
                </Card.Section>
                <Card.Section flush>
                  <ResourceList
                    selectedItems={selected}
                    onSelectionChange={setSelected}
                    emptyState={
                      <EmptyState
                        heading="No items added"
                        action={{
                          content: "Select products",
                          onAction: () => setShowResourcePicker(true),
                        }}
                        image="https://cdn.shopify.com/s/files/1/2376/3301/products/emptystate-files.png"
                      >
                        {" "}
                      </EmptyState>
                    }
                    items={items}
                    renderItem={function renderItem(item) {
                      const {
                        displayName,
                        price,
                        compareAtPrice,
                        product,
                        id,
                      } = item;
                      let imgUrl = product?.images?.[0]?.originalSrc;
                      let oldPrice = compareAtPrice;
                      let newPrice = (
                        ((100 - Number(percentage.value)) *
                          Number(compareAtPrice)) /
                        100
                      ).toFixed(2);
                      return (
                        <ResourceItem
                          id={id}
                          accessibilityLabel={`View details for ${displayName}`}
                          media={
                            <Thumbnail
                              size="medium"
                              source={imgUrl}
                              customer={false}
                            />
                          }
                        >
                          <Stack distribution="fill">
                            <div>
                              <h3>
                                <TextStyle variation="strong">
                                  {displayName}
                                </TextStyle>
                              </h3>
                              <div>
                                Old price: <span>{oldPrice}</span>
                              </div>
                              <div>
                                Current price: <span>{price}</span>
                              </div>
                            </div>
                            <Stack vertical alignment="trailing">
                              <Stack>
                                <div>New price: </div>
                                <TextStyle variation="strong">
                                  {newPrice}
                                </TextStyle>
                              </Stack>
                              {price !== newPrice && (
                                <Button
                                  loading={process[id]?.then}
                                  onClick={() => {
                                    setProcess({
                                      ...process,
                                      [id]: fetch(`/api/variant-price-update`, {
                                        method: "POST",
                                        body: JSON.stringify({
                                          id: id,
                                          price: newPrice,
                                          compareAtPrice: oldPrice,
                                        }),
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                      })
                                        .then((res) => res.json())
                                        .then((res) => {
                                          setProcess({
                                            ...process,
                                            [id]: res,
                                          });
                                        }),
                                    });
                                  }}
                                  primary
                                >
                                  Update
                                </Button>
                              )}
                            </Stack>
                          </Stack>
                        </ResourceItem>
                      );
                    }}
                    resourceName={{ singular: "product", plural: "products" }}
                  />
                  {showResourcePicker &&
                    resourceType === ResourceType.Product && (
                      <ProductsList
                        {...{ selected, setProducts, toggleResourcePicker }}
                      />
                    )}
                  {showResourcePicker &&
                    resourceType === ResourceType.Collection && (
                      <ProductsListByColection
                        {...{ selected, setProducts, toggleResourcePicker }}
                      />
                    )}
                </Card.Section>
              </Card>
            </FormLayout>
          </Form>
        </Layout.Section>
        <Layout.Section secondary>
          <Card title="Summary">
            <Card.Section s title={title.value}>
              <List type="bullet">
                <List.Item>
                  Selected Discount:{" "}
                  <TextStyle variation="strong">Percentage</TextStyle>
                </List.Item>
                <List.Item>
                  <TextStyle variation="strong">
                    {percentage.value} %{" "}
                  </TextStyle>
                  {` discount applied on ${items.length} items.`}
                </List.Item>
                <List.Item>{`${items.length} items selected`}</List.Item>
              </List>
            </Card.Section>
            <Card.Section>
              <Button
                onClick={() => {
                  updateAllPrice(0, items);
                }}
                fullWidth
                primary
              >
                {current ? `${current}/${items.length}` : `Update price`}
              </Button>
            </Card.Section>
          </Card>
        </Layout.Section>
      </Layout>
      {current && (
        <Modal
          title="Updating price"
          open={true}
          onClose={() => {
            setCurrent(0);
            setProcess({});
          }}
        >
          <Modal.Section>
            <Stack distribution="center">
              <div>
                {current}/{items.length}
              </div>
            </Stack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}

const ProductsList = ({ selected, setProducts, toggleResourcePicker }) => {
  return (
    <ResourcePicker
      resourceType={ResourceType.Product}
      showVariants={true}
      selectMultiple={true}
      onCancel={toggleResourcePicker}
      onSelection={setProducts}
      open
    />
  );
};
const ProductsListByColection = ({
  selected,
  setProducts,
  toggleResourcePicker,
}) => {
  const [initialSelectionIds, setinitialSelectionIds] = useState();
  const [loading, setLoading] = useState();
  const fetch = useAuthenticatedFetch();
  return (
    <>
      <ResourcePicker
        resourceType={ResourceType.Collection}
        showVariants={true}
        selectMultiple={true}
        onCancel={toggleResourcePicker}
        onSelection={async ({ selection }) => {
          setLoading(true);
          await fetch(
            `/api/products/collection?collectionId=${selection[0].id}`
          )
            .then((res) => res.json())
            .then((res) => {
              setinitialSelectionIds(
                res.flatMap((item) => item.map(({ node }) => node))
              );
            });
          setLoading(false);
        }}
        open
      />
      {loading && (
        <Modal
          title="Add products"
          open={loading}
          onClose={toggleResourcePicker}
        >
          <Modal.Section>
            <Stack distribution="center">
              <Spinner />
            </Stack>
          </Modal.Section>
        </Modal>
      )}
      {initialSelectionIds && (
        <ResourcePicker
          initialSelectionIds={initialSelectionIds}
          resourceType={ResourceType.Product}
          showVariants={true}
          selectMultiple={true}
          onCancel={toggleResourcePicker}
          onSelection={setProducts}
          open
        />
      )}
    </>
  );
};
