import { Add, DeleteOutline } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type {
  FlatPremiumScenario,
  ProjectionResult,
  ReturnScenario,
} from "../calculation/types";
import { currency } from "../formatting";

export function FlatComparison({
  scenarios,
  legacy,
  flat,
  onChange,
  showControls = true,
  showResults = true,
}: {
  scenarios: FlatPremiumScenario[];
  legacy: { scenario: ReturnScenario; result: ProjectionResult }[];
  flat: { returnId: string; scenarioId: string; result: ProjectionResult }[];
  onChange: (value: FlatPremiumScenario[]) => void;
  showControls?: boolean;
  showResults?: boolean;
}) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">
          Eerbiedigende werking versus vlakke premie
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          De eerbiedigende werking gebruikt de huidige regeling. Vlakke
          scenario’s hanteren verder exact dezelfde aannames.
        </Typography>
        {showControls &&
          scenarios.map((item) => (
            <Stack key={item.id} direction="row" spacing={1} sx={{ mb: 1 }}>
              <TextField
                fullWidth
                label="Scenario"
                value={item.name}
                onChange={(e) =>
                  onChange(
                    scenarios.map((x) =>
                      x.id === item.id ? { ...x, name: e.target.value } : x,
                    ),
                  )
                }
              />
              <TextField
                label="Vlak percentage"
                type="number"
                value={item.totalPremiumPercentage}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">%</InputAdornment>
                    ),
                  },
                }}
                onChange={(e) =>
                  onChange(
                    scenarios.map((x) =>
                      x.id === item.id
                        ? {
                            ...x,
                            totalPremiumPercentage: Number(e.target.value) || 0,
                          }
                        : x,
                    ),
                  )
                }
              />
              <IconButton
                onClick={() =>
                  onChange(scenarios.filter((x) => x.id !== item.id))
                }
              >
                <DeleteOutline />
              </IconButton>
            </Stack>
          ))}
        {showControls && (
          <Button
            startIcon={<Add />}
            onClick={() =>
              onChange([
                ...scenarios,
                {
                  id: crypto.randomUUID(),
                  name: "Nieuw vlak scenario",
                  totalPremiumPercentage: 0,
                  employeeContribution: { method: "none", value: 0 },
                  visible: true,
                },
              ])
            }
          >
            Vlak scenario toevoegen
          </Button>
        )}
        {showResults &&
          legacy.map(({ scenario, result }) => (
            <Box key={scenario.id} sx={{ mt: 2 }}>
              <Typography variant="subtitle2">
                {scenario.name} — eerbiedigende werking:{" "}
                {currency(result.endCapital)}
              </Typography>
              {flat
                .filter((x) => x.returnId === scenario.id)
                .map((x) => (
                  <Typography key={x.scenarioId} variant="body2">
                    {scenarios.find((s) => s.id === x.scenarioId)?.name}:{" "}
                    {currency(x.result.endCapital)}. Dit ligt{" "}
                    {x.result.endCapital >= result.endCapital
                      ? "hoger"
                      : "lager"}{" "}
                    dan de eerbiedigende werking met{" "}
                    {currency(
                      Math.abs(x.result.endCapital - result.endCapital),
                    )}
                    .
                  </Typography>
                ))}
            </Box>
          ))}
      </CardContent>
    </Card>
  );
}
