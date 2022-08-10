import {
  ContextualSaveBar,
  ResourcePicker,
  TitleBar,
} from "@shopify/app-bridge-react";
import {
  Button,
  ButtonGroup,
  Card,
  Form,
  FormLayout,
  Layout,
  Page,
  TextField,
} from "@shopify/polaris";
import { notEmptyString, useField, useForm } from "@shopify/react-form";
import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuthenticatedFetch } from "../../hooks";
const ResourceType = {
  Product: "Product",
  Collection: "Collection",
};
export default function PromoEdit() {
  const { id } = useParams();
  const [resourceType, setResourceType] = useState("Product");
  const [products, setProducts] = useState();
  const fetch = useAuthenticatedFetch();
  const breadcrumbs = [{ content: "Promotion", url: "/" }];
  const [showResourcePicker, setShowResourcePicker] = useState(false);
  const onSubmit = useCallback((body) => {
    (async () => {
      const parsedBody = body;
      parsedBody.key = id;

      /* use (authenticated) fetch from App Bridge to send the request to the API and, if successful, clear the form to reset the ContextualSaveBar and parse the response JSON */
      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify(parsedBody),
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        const result = await response.json();
        console.log({ result });
      }
    })();
    return { status: "success" };
  }, []);
  const {
    fields: { title, productIds, percentage },
    dirty,
    reset,
    submitting,
    submit,
    makeClean,
  } = useForm({
    fields: {
      title: useField({
        value: "",
        validates: [notEmptyString("Please name your QR code")],
      }),
      productIds: useField({
        value: "",
        validates: [notEmptyString("Please select a product")],
      }),
      percentage: useField({
        value: "",
        validates: [notEmptyString("Please enter a percentage")],
      }),
    },
    onSubmit,
  });
  const toggleResourcePicker = useCallback(
    () => setShowResourcePicker(!showResourcePicker),
    [showResourcePicker]
  );
  console.log({ products });
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
                <Card.Section>
                  {showResourcePicker && (
                    <ResourcePicker
                      resourceType={resourceType}
                      showVariants={true}
                      selectMultiple={true}
                      onCancel={toggleResourcePicker}
                      onSelection={setProducts}
                      open
                    />
                  )}
                </Card.Section>
              </Card>
            </FormLayout>
          </Form>
        </Layout.Section>
        <Layout.Section secondary>
          <Card sectioned title="Details">
            <Card.Section sectioned flush>
              <Button primary>Active</Button>
            </Card.Section>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
