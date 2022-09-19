import {
  Button,
  Card,
  ResourceItem,
  ResourceList,
  Stack,
  TextStyle,
  Thumbnail,
} from "@shopify/polaris";
import { ResourceType } from "../pages/promo/[id]";
import { ProductsList } from "./ProductsList";
import { ProductsListByColection } from "./ProductsListByColection";

export function PromoProductsCard({
  handleSelectProducts,
  handleSelectCollections,
  items,
  updateAllPrice,
  process,
  setProducts,
  setShowResourcePicker,
  showResourcePicker,
  resourceType,
  toggleResourcePicker,
}) {
  const processITems = Object.values(process);

  return (
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
      <Card.Section>
        {!!processITems.length && (
          <ResourceList
            items={processITems}
            renderItem={function renderItem(item = {}) {
              const { old, new: currentItem } = item;
              const { compareAtPrice, id, price, displayName, image } = old;
              let imgUrl = image?.url;
              let oldPrice = compareAtPrice || price;
              let newPrice = currentItem?.price;

              return (
                <ResourceItem
                  id={id}
                  accessibilityLabel={`View details for ${displayName}`}
                  media={
                    <Thumbnail size="medium" source={imgUrl} customer={false} />
                  }
                >
                  <Stack distribution="fill">
                    <div>
                      <h3>
                        <TextStyle variation="strong">{displayName}</TextStyle>
                      </h3>
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
                  </Stack>
                </ResourceItem>
              );
            }}
            resourceName={{ singular: "product", plural: "products" }}
          />
        )}
        <ProductsList
          {...{
            setProducts: (products) => {
              setProducts(products);
              setShowResourcePicker(false);
            },
            open: showResourcePicker && resourceType === ResourceType.Product,
            toggleResourcePicker: toggleResourcePicker,
          }}
        />
        {showResourcePicker && resourceType === ResourceType.Collection && (
          <ProductsListByColection {...{ setProducts, toggleResourcePicker }} />
        )}
      </Card.Section>
    </Card>
  );
}
