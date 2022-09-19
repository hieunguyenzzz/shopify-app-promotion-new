import {
  ContextualSaveBar,
  TitleBar,
  useNavigate,
  useToast,
} from "@shopify/app-bridge-react";
import {
  Badge,
  Button,
  Card,
  Form,
  FormLayout,
  Layout,
  Link,
  List,
  Modal,
  Page,
  ProgressBar,
  Stack,
  TextField,
  TextStyle,
} from "@shopify/polaris";
import { notEmptyString, useField, useForm } from "@shopify/react-form";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PromoProductsCard } from "../../components/PromoProductsCard";
import { useAppQuery, useAuthenticatedFetch } from "../../hooks";
export const ResourceType = {
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
  console.log({ defaultValue });
  const onSubmit = useCallback(async (body) => {
    const parsedBody = body;
    parsedBody.key = id;
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
    fields: { title, percentage, selected },
    dirty,
    reset,
    submitting,
    submit,
    makeClean,
  } = useForm({
    fields: {
      title: useField({
        value: defaultValue?.title || "New",
        validates: [notEmptyString("Please enter a title")],
      }),
      percentage: useField({
        value: defaultValue?.percentage || 0,
        validates: [notEmptyString("Please enter a percentage")],
      }),
      selected: useField(defaultValue?.selected),
    },
    onSubmit,
    makeCleanAfterSubmit: true,
  });
  useEffect(() => {
    try {
      if (defaultValue) {
        title.newDefaultValue(defaultValue.title);
        percentage.newDefaultValue(defaultValue.percentage);
        selected.newDefaultValue(defaultValue?.selected);
      }
    } catch (error) {
      console.error(error);
    }
  }, [defaultValue]);

  const toggleResourcePicker = () =>
    setShowResourcePicker((showResourcePicker) => !showResourcePicker);

  function handleDelete() {
    console.log("Archive");
    onArchive({ ...defaultValue, active: false });
  }
  async function updateAllPrice(start = 0) {
    setProcess({});
    if (dirty) {
      submit();
    }
    let current = start;
    while (current < items.length) {
      setCurrent(current + 1);
      const id = items[current];
      let variantData = await fetch(`/api/variant`, {
        method: "POST",
        body: JSON.stringify({
          id: id,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }).then((res) => res.json());
      console.log({ variantData: variantData });
      const variant = variantData?.body.data.productVariant;
      const { compareAtPrice, price } = variant;
      let oldPrice = compareAtPrice || price;
      const newPrice = (
        ((100 - Number(percentage.value)) * Number(oldPrice)) /
        100
      ).toFixed(2);
      setProcess((process) => ({
        ...process,
        [id]: {
          old: variant,
        },
      }));
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

      let result = await promiseData.then((res) => res.json());
      const newVariant = result?.body.data.productVariantUpdate.productVariant;
      current++;
      setProcess((process) => ({
        ...process,
        [id]: {
          old: variant,
          new: newVariant,
        },
      }));
    }
    setCurrent(0);
  }
  function handleSelectProducts() {
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
  const items =
    (selected?.value || []).flatMap(({ variants }) =>
      variants.map((variant) => variant.id)
    ) || [];
  console.log({ selected, title, items });
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
              <PromoProductsCard
                {...{
                  selection: selected.value,
                  handleSelectProducts,
                  handleSelectCollections,
                  items,
                  updateAllPrice,
                  process,
                  setProcess,
                  fetch,
                  setProducts: (value) => {
                    selected.onChange(
                      value.selection.map(({ variants, id }) => ({
                        id,
                        variants: variants.map(({ id }) => {
                          return {
                            id,
                          };
                        }),
                      }))
                    );
                    setShowResourcePicker(false);
                  },
                  setShowResourcePicker,
                  showResourcePicker,
                  resourceType,
                  toggleResourcePicker,
                }}
              ></PromoProductsCard>
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
