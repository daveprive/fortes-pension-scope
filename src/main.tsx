import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { nl } from "date-fns/locale";
import App from "./App";
import "./styles.css";

// eslint-disable-next-line react-refresh/only-export-components
function Root() {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: mode === "light" ? "#165c59" : "#64d8d1" },
          secondary: { main: "#805a28" },
          background: { default: mode === "light" ? "#f6f8f7" : "#101817" },
        },
        shape: { borderRadius: 14 },
        typography: { fontFamily: "Inter, Arial, sans-serif" },
        components: {
          MuiTextField: { defaultProps: { variant: "standard" } },
          MuiSelect: { defaultProps: { variant: "standard" } },
        },
      }),
    [mode],
  );
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App
        mode={mode}
        onToggleTheme={() => setMode(mode === "light" ? "dark" : "light")}
      />
    </ThemeProvider>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={nl}>
      <Root />
    </LocalizationProvider>
  </StrictMode>,
);
