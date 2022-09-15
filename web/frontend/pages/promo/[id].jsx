import {
  ContextualSaveBar,
  ResourcePicker,
  TitleBar,
  useNavigate,
  useToast,
} from "@shopify/app-bridge-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Form,
  FormLayout,
  Layout,
  Link,
  List,
  Modal,
  Page,
  ProgressBar,
  ResourceItem,
  ResourceList,
  Spinner,
  Stack,
  TextField,
  TextStyle,
  Thumbnail,
} from "@shopify/polaris";
import { notEmptyString, useField, useForm } from "@shopify/react-form";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppQuery, useAuthenticatedFetch } from "../../hooks";
const ResourceType = {
  Product: "Product",
  Collection: "Collection",
};
export default function PromoEdit() {
  const navigate = useNavigate();
  const [process, setProcess] = useState({});
  const [current, setCurrent] = useState(0);
  const { data, refetch } = useAppQuery({
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
  const { show } = useToast();
  const defaultValue = useMemo(() => {
    if (promotion) {
      const parsedValue = JSON.parse(promotion.value);
      return parsedValue;
    }
    return null;
  }, [promotion]);
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
  const onArchive = useCallback(async (body) => {
    show("Deleting...");
    const parsedBody = { ...body };
    parsedBody.key = id;
    parsedBody.archived = true;
    await fetch(`/api/promo/update?shopId=${shopId}`, {
      method: "POST",
      body: JSON.stringify(parsedBody),
      headers: { "Content-Type": "application/json" },
    });
    show("Deleted");
    return navigate("/");
  }, []);

  const {
    fields: { title, percentage, active },
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

  useEffect(() => {
    try {
      if (defaultValue) {
        title.newDefaultValue(defaultValue.title);
        percentage.newDefaultValue(defaultValue.percentage);
      }
    } catch (error) {
      console.error(error);
    }
  }, [defaultValue]);

  const toggleResourcePicker = useCallback(
    () => setShowResourcePicker(!showResourcePicker),
    [showResourcePicker]
  );

  const items = (products?.selection || []).flatMap(
    ({ variants, ...product }) =>
      variants.map((variant) => {
        const compareAtPrice =
          process[variant.id]?.body?.data.productVariantUpdate.productVariant
            .compareAtPrice || variant.compareAtPrice;
        const price =
          process[variant.id]?.body?.data.productVariantUpdate.productVariant
            .price || variant.price;
        let oldPrice = compareAtPrice || price;
        return {
          ...variant,
          product,
          compareAtPrice,
          price,
          newPrice: (
            ((100 - Number(percentage.value)) * Number(oldPrice)) /
            100
          ).toFixed(2),
        };
      })
  );

  function handleDelete() {
    console.log("Archive");
    onArchive({ ...defaultValue, active: false });
  }
  async function updateAllPrice(start = 0) {
    if (dirty) {
      submit();
    }
    let current = start;
    while (current < items.length) {
      setCurrent(current + 1);
      let currentItem = items[current];
      const { compareAtPrice, price, newPrice, id } = currentItem;
      let oldPrice = compareAtPrice || price;

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
  function handleSelectProducts() {
    if (dirty) {
      submit();
    }
    setResourceType(ResourceType.Product);
    setShowResourcePicker(true);
  }
  function handleSelectCollections() {
    if (dirty) {
      submit();
    }
    setResourceType(ResourceType.Collection);
    setShowResourcePicker(true);
  }
  console.log({ process });
  return (
    <Page
      fullWidth
      breadcrumbs={breadcrumbs}
      title={title.value || promotion.key}
      titleMetadata={
        !defaultValue?.archived ? (
          <Badge status="success">Active</Badge>
        ) : (
          <Badge>Archived</Badge>
        )
      }
      actionGroups={[
        {
          title: "Actions",
          actions: [
            {
              content: "Delete",
              destructive: true,
              onAction: handleDelete,
            },
          ],
        },
      ]}
    >
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
                title="Update product prices"
                actions={[
                  {
                    content: "Select products",
                    onAction: handleSelectProducts,
                  },
                  {
                    content: "Select collections",
                    onAction: handleSelectCollections,
                  },
                ]}
              >
                {Boolean(items.length) && (
                  <Card.Section subdued>
                    <Stack distribution="trailing">
                      <div></div>
                      <Button
                        primary
                        onClick={() => {
                          updateAllPrice(0, items);
                        }}
                      >
                        Update {items.length} products
                      </Button>
                    </Stack>
                  </Card.Section>
                )}
                <Card.Section flush>
                  <ResourceList
                    emptyState={
                      <EmptyState
                        heading="No items added"
                        action={{
                          content: "Add products",
                          onAction: handleSelectProducts,
                        }}
                        secondaryAction={{
                          content: "Add Collection",
                          onAction: handleSelectCollections,
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
                        newPrice,
                        id,
                      } = item;
                      let imgUrl = product?.images?.[0]?.originalSrc;
                      let oldPrice = compareAtPrice || price;

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
                                Compare at price: <span>{oldPrice}</span>
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
                                    console.log({ products });
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
                  <ProductsList
                    {...{
                      setProducts: (products) => {
                        setProducts(products);
                        setShowResourcePicker(false);
                      },
                      open:
                        showResourcePicker &&
                        resourceType === ResourceType.Product,
                      toggleResourcePicker: toggleResourcePicker,
                    }}
                  />
                  {showResourcePicker &&
                    resourceType === ResourceType.Collection && (
                      <ProductsListByColection
                        {...{ setProducts, toggleResourcePicker }}
                      />
                    )}
                </Card.Section>
              </Card>
            </FormLayout>
          </Form>
        </Layout.Section>
        <Layout.Section secondary>
          <Stack vertical>
            <Card title="Summary">
              <Card.Section title={title.value}>
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
              <Card.Section title="Need help?">
                Check out our video tutorials to learn more about creating and
                managing promos.{" "}
                <Link external url="/">
                  Watch tutorials?
                </Link>
              </Card.Section>
            </Card>
            <Button destructive onClick={handleDelete}>
              Delete
            </Button>
          </Stack>
        </Layout.Section>
      </Layout>
      {Boolean(current) && (
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
            <ProgressBar progress={(current / items.length) * 100} />
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}

const ProductsList = ({ open, setProducts, toggleResourcePicker }) => {
  return (
    <ResourcePicker
      resourceType={ResourceType.Product}
      showVariants={true}
      selectMultiple={true}
      onCancel={toggleResourcePicker}
      onSelection={setProducts}
      open={open}
    />
  );
};
const ProductsListByColection = ({ setProducts, toggleResourcePicker }) => {
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
          selectMultiple={false}
          onCancel={toggleResourcePicker}
          onSelection={setProducts}
          open
        />
      )}
    </>
  );
};
