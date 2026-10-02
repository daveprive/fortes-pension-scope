import { InfoOutlined } from "@mui/icons-material";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState, type ReactNode } from "react";

/** A compact, accessible explanation trigger for an indicative calculation. */
export function CalculationInfo({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Tooltip title="Bekijk berekeninguitleg">
        <IconButton
          size="small"
          color="primary"
          aria-label={`Uitleg: ${title}`}
          onClick={() => setOpen(true)}
        >
          <InfoOutlined fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {children}
            <Typography variant="caption" color="text.secondary">
              Dit is een indicatieve scenario-berekening. De daadwerkelijke
              pensioenuitkomst kan afwijken.
            </Typography>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
