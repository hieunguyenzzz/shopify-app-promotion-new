import { TitleBar, useNavigate } from "@shopify/app-bridge-react";
import {
  Button,
  Card,
  Heading,
  Layout,
  List,
  Loading,
  Page,
  ResourceItem,
  ResourceList,
  Stack,
  TextStyle,
} from "@shopify/polaris";
import { useEffect, useState } from "react";
import { useAuthenticatedFetch } from "../hooks";
import { useAppQuery } from "../hooks/useAppQuery";

export default function Multiple() {
  const { data, isLoading } = useAppQuery({
    url: "/api/promo/get",
    reactQueryOptions: {},
  });
  if (!data) {
    return <Loading />;
  }
  console.log({ data });
  return <MultipleInner data={data} isLoading={isLoading} />;
}

function MultipleInner({ data }) {
  const [selectedPromo, setSelectedPromo] = useState([]);
  const [items, setItems] = useState([]);
  useEffect(() => {
    setItems(
      (data?.body?.data?.shop?.metafields?.edges || [])
        .map((edge) => {
          let parsedValue;
          try {
            parsedValue = JSON.parse(edge.node.value);
          } catch (error) {
            console.log(error);
            parsedValue = {};
          }
          return {
            ...edge.node,
            ...parsedValue,
          };
        })
        .filter((item) => !item.archived)
    );
  }, [data]);
  console.log({ items });

  const exited = {};
  const selectedItems = items.filter((item) => selectedPromo.includes(item.id));

  const fetch = useAuthenticatedFetch();

  const shopId = data?.body?.data?.shop?.id;
  const handleCreate = async () => {
    await fetch(`/api/promo/create?shopId=${shopId}`)
      .then((res) => res.json())
      .then((res) => {
        navigate(`/promo/${res.body.data.metafieldsSet.metafields[0].key}`);
      });
  };
  const navigate = useNavigate();
  console.log({ selectedPromo });
  return (
    <Page fullWidth>
      <TitleBar
        breadcrumbs={[{ content: "Promotion", url: "/" }]}
        title={`Multiple promotion`}
      />
      <Layout>
        <Layout.Section secondary>
          <Card title="Promos">
            <Card.Section subdued>
              <Stack distribution="trailing">
                <div></div>
                <Button primary onClick={handleCreate}>
                  Create promotion
                </Button>
              </Stack>
            </Card.Section>
            {items?.length && (
              <Card.Section flush>
                <ResourceList
                  resourceName={{
                    plural: "promos",
                    singular: "promo",
                  }}
                  items={items}
                  selectedItems={selectedPromo}
                  onSelectionChange={setSelectedPromo}
                  promotedBulkActions={[
                    {
                      content: "Apply",
                      onAction: () =>
                        navigate(`/multiple?ids=${selectedPromo.toString()}`),
                    },
                  ]}
                  bulkActions={
                    [
                      // {
                      //   content: "Add tags",
                      //   onAction: () =>
                      //     console.log("Todo: implement bulk add tags"),
                      // },
                      // {
                      //   content: "Remove tags",
                      //   onAction: () =>
                      //     console.log("Todo: implement bulk remove tags"),
                      // },
                      // {
                      //   content: "Delete customers",
                      //   onAction: () =>
                      //     console.log("Todo: implement bulk delete"),
                      // },
                    ]
                  }
                  resolveItemId={function resolveItemIds({ id }) {
                    return id;
                  }}
                  renderItem={function renderItem(props) {
                    console.log({ props });
                    const { id, key, title, percentage, selected, ...rest } =
                      props;
                    const url = `/promo/${key}`;
                    const items = (selected || []).flatMap(({ variants }) =>
                      variants.map((variant) => variant.id)
                    );

                    return (
                      <ResourceItem key={id} id={id}>
                        <Stack spacing="tight" vertical>
                          <Heading>{title || id}</Heading>
                          <List type="bullet">
                            <List.Item>
                              Selected Discount:{" "}
                              <TextStyle variation="strong">
                                Percentage
                              </TextStyle>
                            </List.Item>
                            <List.Item>
                              <TextStyle variation="strong">
                                {percentage} %{" "}
                              </TextStyle>
                              {` discount applied on ${items.length} items.`}
                            </List.Item>
                            <List.Item>{`${items.length} items selected`}</List.Item>
                          </List>
                        </Stack>
                        <Stack distribution="equalSpacing">
                          <div></div>
                          <Button
                            onClick={(e) => {
                              navigate(url);
                            }}
                            url={url}
                          >
                            Edit
                          </Button>
                        </Stack>
                      </ResourceItem>
                    );
                  }}
                />
              </Card.Section>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
