export const errorHandler = ({
  error,
  functionName,
  message,
  req,
  res,
}: {
  error: any;
  functionName: string;
  message: string;
  req?: any;
  res?: any;
}) => {
  try {
    if (process.env.NODE_ENV === "development") console.error("❌ Error:", error);

    const reqQueryParams = req?.query;
    if (reqQueryParams?.interactiveNonce) delete reqQueryParams.interactiveNonce;

    console.error(
      JSON.stringify({
        errorContext: {
          message,
          functionName,
        },
        requestContext: {
          requestId: req?.id,
          reqQueryParams,
          reqBody: req?.body,
        },
        error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      }),
    );

    const status = error?.status || 500;
    const errorMessage = typeof error?.message === "string" ? error.message : String(error);
    const errorName = typeof error?.name === "string" ? error.name : undefined;
    const responseBody = {
      success: false,
      message,
      error: { message: errorMessage, name: errorName },
    };

    if (res && !res.headersSent) return res.status(status).send(responseBody);
    return { error: responseBody.error };
  } catch (e: any) {
    console.error("❌ Error printing the logs", e);
    if (res && !res.headersSent) {
      return res.status(500).send({
        success: false,
        message,
        error: { message: e?.message || String(e), name: e?.name },
      });
    }
    return { error: e };
  }
};
