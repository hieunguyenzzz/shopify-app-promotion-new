import { TitleBar, useNavigate } from "@shopify/app-bridge-react";
import {
  Avatar,
  Button,
  ButtonGroup,
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
  TextStyle,
  Tooltip,
} from "@shopify/polaris";
import {
  DeleteMajor,
  DragHandleMinor,
  ImageMajor,
} from "@shopify/polaris-icons";
import { useCallback, useEffect, useReducer, useState } from "react";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import { useAuthenticatedFetch } from "../hooks";
import { useAppQuery } from "../hooks/useAppQuery";
function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}
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
const initialState = {
  eventId: null,
  process: {},
  current: 0,
};
function reducer(state, action) {
  switch (action.type) {
    case "start":
      return {
        ...initialState,
        eventId: Date.now(),
      };
    case "reset":
      return initialState;
    case "next":
      return {
        ...state,
        current: state.current + 1,
        process: {
          ...state.process,
          ...action.payload,
        },
      };
    default:
      console.log({ action });
      throw new Error("action undefined");
  }
}
const useUpdateAllPrices = ({ variants = [] }) => {
  const [{ eventId, process, current }, dispatch] = useReducer(
    reducer,
    initialState
  );
  const fetch = useAuthenticatedFetch();

  useEffect(async () => {
    const variant = variants[current];
    async function updateVariantPrice(variantId, promotion) {
      const id = variantId;
      const percentage = promotion.percentage;
      let variantData = await fetch(`/api/variant`, {
        method: "POST",
        body: JSON.stringify({
          id: id,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }).then((res) => res.json());
      const variant = variantData?.body.data.productVariant;
      const { compareAtPrice, price } = variant;
      let oldPrice = compareAtPrice || price;
      const newPrice = (
        ((100 - Number(percentage)) * Number(oldPrice)) /
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

      let result = await promiseData.then((res) => res.json());
      const newVariant = result?.body.data.productVariantUpdate.productVariant;

      dispatch({
        type: "next",
        payload: {
          [id]: {
            promotion,
            old: variant,
            new: newVariant,
          },
        },
      });
    }
    if (eventId && variant) {
      let variantId = variant.id;
      let promotion = variant.promotion;
      await updateVariantPrice(variantId, promotion);
    }
    return () => {};
  }, [variants, process, eventId, current]);

  return {
    process,
    isLoading: eventId && current <= variants.length,
    reset: () => dispatch({ type: "reset" }),
    start: () => dispatch({ type: "start" }),
    cancel: () => {
      dispatch({ type: "cancel" });
    },
  };
};
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
  const variants = selectedItems
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
  const { start, isLoading, process } = useUpdateAllPrices({ variants });
  const processITems = Object.values(process);
  const handleAdd = useCallback(({ id }) => {
    setSelectedPromo((selectedPromo) =>
      [id, ...selectedPromo].filter(onlyUnique)
    );
  }, []);
  const handleDelete = useCallback(({ id }) => {
    setSelectedPromo((selectedPromo) =>
      selectedPromo.filter(
        (value, index, self) => id !== value && onlyUnique(value, index, self)
      )
    );
  }, []);
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
                <DragableList {...{ items, setItems }} onAdd={handleAdd} />
              </Card.Section>
            )}
          </Card>
        </Layout.Section>
        {
          <Layout.Section>
            <Card title="Logs">
              <Card.Section subdued>
                <Stack distribution="equalSpacing" alignment="center">
                  <Stack>
                    {selectedItems.map((item) => (
                      <ButtonGroup key={item.id} segmented>
                        <Button
                          disabled={isLoading}
                          outline
                          pressed={console.log}
                          onClick={console.log}
                        >
                          {item.title}
                        </Button>
                        <Button
                          disabled={isLoading}
                          destructive
                          pressed={console.log}
                          onClick={() => handleDelete(item)}
                          icon={DeleteMajor}
                        ></Button>
                      </ButtonGroup>
                    ))}
                  </Stack>

                  <Button
                    loading={isLoading}
                    primary
                    onClick={() => {
                      start();
                    }}
                  >
                    Update {processITems.length}/{variants.length} items
                  </Button>
                </Stack>
              </Card.Section>
              <Card.Section fullWidth>
                <ResourceList
                  loading={isLoading}
                  items={processITems}
                  renderItem={function renderItem(item = {}) {
                    const { old, new: currentItem, promotion } = item;
                    const { compareAtPrice, id, price, displayName, image } =
                      old;
                    let imgUrl = image?.url;
                    let oldPrice = compareAtPrice || price;
                    let newPrice = currentItem?.price;

                    return (
                      <ResourceItem
                        id={id}
                        accessibilityLabel={`View details for ${displayName}`}
                        media={
                          <Avatar
                            size="large"
                            source={imgUrl || ImageMajor}
                            customer={false}
                            shape="square"
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
                              New price: <span>{newPrice}</span>
                            </div>
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
        }
      </Layout>
    </Page>
  );
}
function DragableList({ items, setItems, onAdd }) {
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
                  onAdd={onAdd}
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
  const { id, title, percentage, index, selected, url, onAdd } = props;
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
                </Stack>
              </Stack>
              <Stack distribution="equalSpacing">
                <div></div>
                <ButtonGroup>
                  <Button
                    onClick={() => {
                      navigate(url);
                    }}
                    url={url}
                  >
                    Edit
                  </Button>
                  <Button
                    primary
                    onClick={() => {
                      onAdd(props);
                    }}
                    url={url}
                  >
                    Add
                  </Button>
                </ButtonGroup>
              </Stack>
            </div>
          </div>
        );
      }}
    </Draggable>
  );
}
