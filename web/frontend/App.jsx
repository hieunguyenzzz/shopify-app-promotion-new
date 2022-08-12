import { NavigationMenu } from "@shopify/app-bridge-react";
import { BrowserRouter } from "react-router-dom";
import Routes from "./Routes";

import { Frame } from "@shopify/polaris";
import {
  AppBridgeProvider,
  PolarisProvider,
  QueryProvider,
} from "./components";

export default function App() {
  // Any .tsx or .jsx files in /pages will become a route
  // See documentation for <Routes /> for more info
  const pages = import.meta.globEager("./pages/**/!(*.test.[jt]sx)*.([jt]sx)");

  return (
    <PolarisProvider>
      <BrowserRouter>
        <AppBridgeProvider>
          <QueryProvider>
            <NavigationMenu navigationLinks={[]} />
            <Frame>
              <Routes pages={pages} />
            </Frame>
          </QueryProvider>
        </AppBridgeProvider>
      </BrowserRouter>
    </PolarisProvider>
  );
}
