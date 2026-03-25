import {
  respondValidationFailure,
  withUnexpectedError,
} from "./routePrimitives.js";
import { validateOperationsReportQuery } from "./reportingValidators.js";

export function registerReportingRoutes(app, { logger, dashboardService }) {
  app.get("/api/v1/reports/operations", (req, res) => withUnexpectedError(logger, req, res, "reports_operations_failed", () => {
    const validation = validateOperationsReportQuery(req.query);
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    const report = dashboardService.getOperationsReport(validation.value);
    res.status(200).json(report);
  }));
}
