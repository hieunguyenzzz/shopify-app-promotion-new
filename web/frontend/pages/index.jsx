import { TitleBar, useNavigate } from "@shopify/app-bridge-react";
import {
  Button,
  Card,
  Heading,
  Icon,
  Layout,
  List,
  Loading,
  Page,
  ResourceItem,
  ResourceList,
  Stack,
  Tabs,
  TextStyle,
  Thumbnail,
  Tooltip,
} from "@shopify/polaris";
import { DragHandleMinor } from "@shopify/polaris-icons";
import { useCallback, useState } from "react";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import { useAuthenticatedFetch } from "../hooks";
import { useAppQuery } from "../hooks/useAppQuery";
const tabs = [
  {
    id: "active",
    content: "Promos",
    panelID: "active-content-1",
  },
];
export default function Multiple() {
  const { data, isLoading } = useAppQuery({
    url: "/api/promo/get",
    reactQueryOptions: {},
  });
  if (!data) {
    return <Loading />;
  }
  console.log({ data });
  return <MultipleInner data={data} />;
}
function MultipleInner({ data }) {
  const [items, setItems] = useState(
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
  console.log({ items });
  const [selected, setSelected] = useState(0);
  const [current, setCurrent] = useState(0);
  const handleTabChange = useCallback(
    (selectedTabIndex) => setSelected(selectedTabIndex),
    []
  );
  const exited = {};
  const variants = items
    .flatMap((item) => {
      const { selected } = item;
      return (selected || []).flatMap(({ variants }) =>
        variants.map((variant) => {
          if (exited[variant.id]) return null;
          exited[variant.id] = true;
          return {
            id: variant.id,
            promotion: item,
          };
        })
      );
    })
    .filter(Boolean);
  console.log({ variants });
  const [process, setProcess] = useState({});
  const [isLoading, setisLoading] = useState(false);
  const fetch = useAuthenticatedFetch();
  async function updateAllPrice(start = 0) {
    setisLoading(true);
    setProcess({});
    let current = start;
    while (current < variants.length) {
      setCurrent(current + 1);
      const id = variants[current].id;
      const percentage = variants[current].promotion.percentage;
      const promotion = variants[current].promotion;
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
        ((100 - Number(percentage)) * Number(oldPrice)) /
        100
      ).toFixed(2);
      setProcess((process) => ({
        ...process,
        [id]: {
          old: variant,
          promotion,
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
          promotion,
          old: variant,
          new: newVariant,
        },
      }));
    }
    setCurrent(0);
    setisLoading(false);
  }
  const processITems = Object.values(process);
  const shopId = data?.body?.data?.shop?.id;
  const handleCreate = async () => {
    await fetch(`/api/promo/create?shopId=${shopId}`)
      .then((res) => res.json())
      .then((res) => {
        navigate(`/promo/${res.body.data.metafieldsSet.metafields[0].key}`);
      });
  };
  const navigate = useNavigate();
  return (
    <Page fullWidth>
      <TitleBar
        breadcrumbs={[{ content: "Promotion", url: "/" }]}
        title={`Multiple promotion`}
      />
      <Layout>
        <Layout.Section secondary>
          <Card>
            <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange}>
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
                  <DragableList {...{ items, setItems }} />
                </Card.Section>
              )}
            </Tabs>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card title="Logs">
            {Boolean(variants.length) && (
              <Card.Section subdued>
                <Stack distribution="trailing">
                  <div></div>
                  <Button
                    loading={isLoading}
                    primary
                    onClick={() => {
                      updateAllPrice(0, items);
                    }}
                  >
                    Update {variants.length} products
                  </Button>
                </Stack>
              </Card.Section>
            )}
            <Card.Section fullWidth>
              <ResourceList
                loading={isLoading}
                items={processITems}
                renderItem={function renderItem(item = {}) {
                  const { old, new: currentItem, promotion } = item;
                  const { compareAtPrice, id, price, displayName, image } = old;
                  let imgUrl = image?.url;
                  let oldPrice = compareAtPrice || price;
                  let newPrice = currentItem?.price;

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
                          <div>Promotion: {promotion.title}</div>
                          <div>
                            Compare at price: <span>{oldPrice}</span>
                          </div>
                          <div>
                            Old price: <span>{price}</span>
                          </div>
                        </div>
                        <Stack vertical alignment="trailing">
                          <div>
                            Current price: <span>{newPrice}</span>
                          </div>
                        </Stack>
                        <Stack alignment="trailing">
                          <div></div>
                        </Stack>
                      </Stack>
                    </ResourceItem>
                  );
                }}
                resourceName={{ singular: "product", plural: "products" }}
              />
            </Card.Section>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
function DragableList({ items, setItems }) {
  const handleDragEnd = useCallback(({ source, destination }) => {
    setItems((oldItems) => {
      if (!destination) {
        return oldItems;
      }
      const newItems = oldItems.slice(); // Duplicate
      const [temp] = newItems.splice(source.index, 1);
      newItems.splice(destination.index, 0, temp);
      return newItems;
    });
  }, []);
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="droppableId">
        {(provided) => {
          return (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {items.map((item, index) => (
                <ListItem
                  key={item.key}
                  {...item}
                  index={index}
                  url={`/promo/${item.key}`}
                />
              ))}
              {provided.placeholder}
            </div>
          );
        }}
      </Droppable>
    </DragDropContext>
  );
}
function ListItem(props) {
  const { id, title, percentage, index, selected, url } = props;
  const items = (selected || []).flatMap(({ variants }) =>
    variants.map((variant) => variant.id)
  );
  const navigate = useNavigate();

  return (
    <Draggable draggableId={id} index={index}>
      {(provided, snapshot) => {
        return (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            style={
              snapshot.isDragging
                ? { background: "white", ...provided.draggableProps.style }
                : provided.draggableProps.style
            }
          >
            <div
              id={id}
              style={{ padding: "1em", borderTop: "1px solid #cecece" }}
            >
              <Stack alignment="center">
                <div {...provided.dragHandleProps}>
                  <Tooltip content="Drag to reorder list items">
                    <Icon source={DragHandleMinor} color="inkLightest" />
                  </Tooltip>
                </div>
                <Stack spacing="tight" vertical>
                  <Heading>{title || id}</Heading>
                  <List type="bullet">
                    <List.Item>
                      Selected Discount:{" "}
                      <TextStyle variation="strong">Percentage</TextStyle>
                    </List.Item>
                    <List.Item>
                      <TextStyle variation="strong">{percentage} % </TextStyle>
                      {` discount applied on ${items.length} items.`}
                    </List.Item>
                    <List.Item>{`${items.length} items selected`}</List.Item>
                  </List>
                  <Stack distribution="equalSpacing">
                    <div></div>
                    <Button
                      onClick={() => {
                        navigate(url);
                      }}
                      url={url}
                    >
                      Edit
                    </Button>
                  </Stack>
                </Stack>
              </Stack>
            </div>
          </div>
        );
      }}
    </Draggable>
  );
}
