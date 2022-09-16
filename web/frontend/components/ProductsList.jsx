import { ResourcePicker } from "@shopify/app-bridge-react";

export const ProductsList = ({ open, setProducts, toggleResourcePicker }) => {
  return (
    <ResourcePicker
      resourceType={"Product"}
      showVariants={true}
      selectMultiple={true}
      onCancel={toggleResourcePicker}
      onSelection={setProducts}
      open={open}
    />
  );
};
