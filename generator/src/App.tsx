import { Route, Routes } from "react-router-dom";
import { UploadPage } from "./pages/UploadPage.js";
import { WizardPage } from "./pages/WizardPage.js";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<UploadPage />} />
      <Route path="/wizard" element={<WizardPage />} />
    </Routes>
  );
}
