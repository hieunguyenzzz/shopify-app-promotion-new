import { TitleBar, useNavigate } from "@shopify/app-bridge-react";
import {
  Badge,
  Card,
  DataTable,
  EmptyState,
  Layout,
  Link,
  Loading,
  Page,
  Tabs,
} from "@shopify/polaris";
import { useCallback, useState } from "react";
import { useAppQuery } from "../hooks/useAppQuery";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch";
const tabs = [
  {
    id: "active",
    content: "Active",
    panelID: "active-content-1",
  },
  {
    id: "archived",
    content: "Archived",
    panelID: "archived-content-1",
  },
];
export default function HomePage() {
  const authenticatedFetch = useAuthenticatedFetch();
  const [selected, setSelected] = useState(0);
  const handleTabChange = useCallback(
    (selectedTabIndex) => setSelected(selectedTabIndex),
    []
  );
  const { data, isLoading } = useAppQuery({
    url: "/api/promo/get",
    reactQueryOptions: {},
  });
  const shopId = data?.body?.data?.shop?.id;
  const items = (data?.body?.data?.shop?.metafields?.edges || []).map(
    (edge) => {
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
    }
  );
  const navigate = useNavigate();
  const [loading, setLoading] = useState();
  console.log({ selected });
  const filter = (item) => {
    const pardsedValue = JSON.parse(item.value);
    if (selected === 1) {
      return pardsedValue.archived;
    } else {
      return !pardsedValue.archived;
    }
  };
  const rows = items.filter(filter).map((item) => {
    const { key, title, percentage, updatedAt, archived } = item;
    return [
      <Link
        onClick={() => {
          navigate(`/promo/${key}`);
        }}
        url={`/promo/${key}`}
      >
        {title || key}
      </Link>,
      "Percentage",
      (percentage || 0) + "%",
      new Date(updatedAt).toUTCString(),
      <div>
        {archived ? (
          <Badge>Archived</Badge>
        ) : (
          <Badge status="success">Active</Badge>
        )}
      </div>,
    ];
  });
  const handleCreate = async () => {
    setLoading(true);
    await authenticatedFetch(`/api/promo/create?shopId=${shopId}`)
      .then((res) => res.json())
      .then((res) => {
        navigate(`/promo/${res.body.data.metafieldsSet.metafields[0].key}`);
      });
    setLoading(false);
  };
  return (
    <Page fullWidth>
      {isLoading && <Loading />}
      <TitleBar
        title={`Promotion ${shopId && "#" + shopId}`}
        primaryAction={{
          content: "Create Promotion",
          loading: !shopId || loading,
          onAction: handleCreate,
        }}
      />
      <Layout>
        <Layout.Section fullWidth>
          <Card>
            <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange}>
              <Card.Section flush>
                <DataTable
                  columnContentTypes={[
                    "text",
                    "numeric",
                    "numeric",
                    "numeric",
                    "numeric",
                  ]}
                  headings={["Name", "Type", "Discount", "Updated", "Status"]}
                  rows={rows}
                  sortable={[false, true, false, false, true]}
                />
                {data && !rows.length && (
                  <EmptyState
                    heading="Manage discounts and promotions"
                    action={{
                      content: "Create promotion",
                      onAction: handleCreate,
                    }}
                    image="https://cdn.shopify.com/s/files/1/2376/3301/products/emptystate-files.png"
                  >
                    <p>
                      Automatic update your products with discounts and
                      promotions{" "}
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
                )}
              </Card.Section>
            </Tabs>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
