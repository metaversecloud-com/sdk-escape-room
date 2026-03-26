import { Request, Response } from "express";
import { errorHandler, getCredentials, incrementAnalytics } from "@utils/index.js";
import { AnalyticsEvent } from "../types/Progress.js";

export const handleTrackAnalytics = async (req: Request, res: Response) => {
  try {
    // Extract credentials and analytics event information from the request; validate that the event parameter is provided, and set a default increment value of 1 if not specified.
    const credentials = getCredentials(req.query);
    const { event, by = 1 } = req.body as { event: AnalyticsEvent; by?: number };

    if (!event) return res.status(400).json({ success: false, message: "event is required" });

    // Increment the specified analytics event for the visitor using the incrementAnalytics utility function, which will handle retrieving and updating the analytics data in the world configuration; return the updated analytics object in the response so that the client can have immediate feedback on the new analytics values after tracking the event.
    const updated = await incrementAnalytics(credentials, event, by);
    return res.json({ success: true, analytics: updated });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleTrackAnalytics",
      message: "Error tracking analytics event",
      req,
      res,
    });
  }
};
