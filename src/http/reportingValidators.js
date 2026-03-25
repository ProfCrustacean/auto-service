import {
  finalizeUnknownQueryFields,
  normalizeLocalDateQuery,
} from "./validatorUtils.js";

export function validateOperationsReportQuery(query) {
  const errors = [];
  const dateFromLocal = normalizeLocalDateQuery(query.dateFromLocal, "dateFromLocal", errors) ?? null;
  const dateToLocal = normalizeLocalDateQuery(query.dateToLocal, "dateToLocal", errors) ?? null;

  if (dateFromLocal && dateToLocal && dateFromLocal > dateToLocal) {
    errors.push({ field: "dateFromLocal", message: "dateFromLocal must be <= dateToLocal" });
  }

  finalizeUnknownQueryFields(query, ["dateFromLocal", "dateToLocal"], errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      dateFromLocal,
      dateToLocal,
    },
  };
}
