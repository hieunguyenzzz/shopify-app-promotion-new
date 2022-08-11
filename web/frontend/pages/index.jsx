import { TitleBar } from "@shopify/app-bridge-react";
import {
  Card,
  EmptyState,
  Layout,
  Link,
  Page,
  ResourceItem,
  ResourceList,
  Tabs,
  TextStyle,
} from "@shopify/polaris";
import { useCallback, useState } from "react";
import { useAppQuery } from "../hooks/useAppQuery";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch";
const tabs = [
  {
    id: "all",
    content: "All",
    accessibilityLabel: "All",
    panelID: "all-content-1",
  },
  {
    id: "active",
    content: "Active",
    panelID: "active-content-1",
  },
];
export default function HomePage() {
  const authenticatedFetch = useAuthenticatedFetch();
  const [selected, setSelected] = useState(0);
  const handleTabChange = useCallback(
    (selectedTabIndex) => setSelected(selectedTabIndex),
    []
  );
  const { data } = useAppQuery({
    url: "/api/promo/get",
    reactQueryOptions: {},
  });
  const shopId = data?.body?.data?.shop?.id;
  const items = (data?.body?.data?.shop?.metafields?.edges || []).map(
    (edge) => edge.node
  );
  return (
    <Page fullWidth>
      <TitleBar
        title={`Promotion ${shopId && "#" + shopId}`}
        primaryAction={{
          content: "Create Promotion",
          loading: !shopId,
          onAction: () => {
            authenticatedFetch(`/api/promo/create?shopId=${shopId}`);
          },
        }}
      />
      <Layout>
        <Layout.Section fullWidth>
          <Card>
            <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange}>
              <Card.Section>
                <ResourceList
                  emptyState={
                    <EmptyState
                      heading="Manage discounts and promotions"
                      action={{ content: "Create promotion" }}
                      image="https://cdn.shopify.com/s/files/1/2376/3301/products/emptystate-files.png"
                    >
                      <p>
                        Create discount codes and automatic discounts that apply
                        at checkout. You can also use discounts with{" "}
                        <Link
                          external
                          url="https://help.shopify.com/en/manual/discounts/sales"
                          target="_blank"
                          rel="noopener noreferrer"
                          data-polaris-unstyled="true"
                        >
                          compare at prices
                        </Link>
                        .
                      </p>
                    </EmptyState>
                  }
                  items={items}
                  renderItem={function renderItem(item) {
                    const { id, namespace, key, type, value } = item;
                    let parsedValue;
                    try {
                      parsedValue = JSON.parse(value);
                    } catch (error) {
                      console.log(error);
                      parsedValue = {};
                    }
                    return (
                      <ResourceItem
                        id={id}
                        url={`/promo/${key}`}
                        accessibilityLabel={`View details for ${key}`}
                      >
                        <h3>
                          <TextStyle variation="strong">
                            {parsedValue.title || key}
                          </TextStyle>
                        </h3>
                        <div>Percentage: {parsedValue.percentage}%</div>
                      </ResourceItem>
                    );
                  }}
                  resourceName={{ singular: "file", plural: "files" }}
                />
              </Card.Section>
            </Tabs>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
