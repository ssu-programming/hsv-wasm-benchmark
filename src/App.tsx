import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";

import NotFound from "./pages/NotFound";
import Main from "./pages/Main";
import Control from "./pages/control/Control";

function App() {
  return (
    <BrowserRouter basename="/hsv-wasm-benchmark">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Main />} />
          <Route path="control" element={<Control />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
