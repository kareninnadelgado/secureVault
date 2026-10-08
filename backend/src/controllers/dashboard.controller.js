import {
  getDashboardSummary as getDashboardSummaryService,
} from '../services/dashboard.service.js';

export async function getDashboardSummary(req, res, next) {
  try {
    const result = await getDashboardSummaryService(
      res.locals.validatedQuery
    );

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}