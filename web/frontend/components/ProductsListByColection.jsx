import { ResourcePicker } from "@shopify/app-bridge-react";
import { Modal, Spinner, Stack } from "@shopify/polaris";
import { useState } from "react";
import { useAuthenticatedFetch } from "../hooks";

export const ProductsListByColection = ({
  setProducts,
  toggleResourcePicker,
}) => {
  const [initialSelectionIds, setinitialSelectionIds] = useState();
  const [loading, setLoading] = useState();
  const fetch = useAuthenticatedFetch();
  return (
    <>
      <ResourcePicker
        resourceType={"Collection"}
        showVariants={true}
        selectMultiple={true}
        onCancel={toggleResourcePicker}
        onSelection={async ({ selection }) => {
          setLoading(true);
          await fetch(
            `/api/products/collection?collectionId=${selection[0].id}`
          )
            .then((res) => res.json())
            .then((res) => {
              setinitialSelectionIds(
                res.flatMap((item) => item.map(({ node }) => node))
              );
            });
          setLoading(false);
        }}
        open
      />
      {loading && (
        <Modal
          title="Add products"
          open={loading}
          onClose={toggleResourcePicker}
        >
          <Modal.Section>
            <Stack distribution="center">
              <Spinner />
            </Stack>
          </Modal.Section>
        </Modal>
      )}
      {initialSelectionIds && (
        <ResourcePicker
          initialSelectionIds={initialSelectionIds}
          resourceType={"Product"}
          showVariants={true}
          selectMultiple={false}
          onCancel={toggleResourcePicker}
          onSelection={setProducts}
          open
        />
      )}
    </>
  );
};
