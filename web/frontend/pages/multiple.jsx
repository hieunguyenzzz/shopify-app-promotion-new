import { TitleBar } from "@shopify/app-bridge-react";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Heading,
  Icon,
  Layout,
  List,
  Loading,
  Page,
  Stack,
  TextStyle,
  Tooltip,
} from "@shopify/polaris";
import { DragHandleMinor } from "@shopify/polaris-icons";
import { useCallback, useEffect, useReducer, useState } from "react";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import { useSearchParams } from "react-router-dom";
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
    isLoading: eventId && current < variants.length,
    reset: () => dispatch({ type: "reset" }),
    start: () => dispatch({ type: "start" }),
    cancel: () => {
      dispatch({ type: "cancel" });
    },
  };
};
function MultipleInner({ data }) {
  let [searchParams] = useSearchParams();
  const [selectedPromo, setSelectedPromo] = useState(
    searchParams.get("ids").split(",")
  );
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
      .filter((item) => selectedPromo.includes(item.id))
  );

  console.log({ items });

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

  const { start, isLoading, process } = useUpdateAllPrices({ variants });
  const processITems = Object.values(process);
  const handleAdd = useCallback(({ id }) => {
    setSelectedPromo((selectedPromo) =>
      [id, ...selectedPromo].filter(onlyUnique)
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
              <Stack distribution="trailing" alignment="center">
                <div>
                  Update {processITems.length}/{variants.length} items
                </div>
                <Button primary onClick={start} loading={isLoading}>
                  Update
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
        <Layout.Section>
          <Card title="Logs">
            <Card.Section fullWidth>
              {!processITems.length && (
                <EmptyState heading="No item found"></EmptyState>
              )}
              {!!processITems.length && (
                <DataTable
                  columnContentTypes={[
                    "text",
                    "text",
                    "numeric",
                    "numeric",
                    "numeric",
                  ]}
                  headings={[
                    "Product",
                    "Promotion",
                    "Compare At Price",
                    "Old price",
                    "New price",
                  ]}
                  rows={
                    processITems?.map(
                      ({
                        old: { compareAtPrice, price: oldPrice, displayName },
                        new: { price: newPrice },
                        promotion,
                      }) => [
                        displayName,
                        promotion.title,
                        compareAtPrice,
                        compareAtPrice || oldPrice,
                        newPrice,
                      ]
                    ) || []
                  }
                ></DataTable>
              )}
            </Card.Section>
          </Card>
        </Layout.Section>
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
  const { id, title, percentage, index, selected } = props;
  const items = (selected || []).flatMap(({ variants }) =>
    variants.map((variant) => variant.id)
  );

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
            </div>
          </div>
        );
      }}
    </Draggable>
  );
}
