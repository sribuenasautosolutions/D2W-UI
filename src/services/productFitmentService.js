import api from "./api";

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

/* ===========================================
   Product Search
=========================================== */

export async function searchProductByPartNumber(partNumber) {
  try {
    const response = await api.get("/products/part-number", {
      params: { partNumber },
    });

    // Supports both wrapped and non-wrapped responses
    return response.data.data ?? response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Could not find this product.")
    );
  }
}

/* ===========================================
   Vehicle Make
=========================================== */

export async function getVehicleMakes() {
  try {
    const response = await api.get("/vehicle-makes");
    return response.data.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Could not load vehicle makes.")
    );
  }
}

/* ===========================================
   Vehicle Model
=========================================== */

export async function getModelsByMake(makeId) {
  try {
    const response = await api.get(
      `/vehicle-models/by-make/${makeId}`
    );

    return response.data.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Could not load vehicle models.")
    );
  }
}

/* ===========================================
   Vehicle Years
=========================================== */

export async function getYearsByModel(modelId) {
  try {
    const response = await api.get(
      "/vehicle-generations/years",
      {
        params: {
          modelId,
        },
      }
    );

    return response.data.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Could not load years.")
    );
  }
}

/* ===========================================
   Vehicle Variants
=========================================== */

export async function getVariants(modelId, year) {
  try {
    const response = await api.get(
      "/vehicle-generations/variants",
      {
        params: {
          modelId,
          year,
        },
      }
    );

    return response.data.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Could not load variants.")
    );
  }
}

/* ===========================================
   Save Fitment
=========================================== */

export async function saveFitment(
  productId,
  variantId,
  notes
) {
  try {
    const payload = {
      productItem: {
        id: productId,
      },
      vehicleVariant: {
        id: variantId,
      },
      notes: notes || null,
    };

    const response = await api.post(
      "/product-fitment",
      payload
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Could not save fitment."
      )
    );
  }
}

/* ===========================================
   Existing Fitments
=========================================== */

export async function getFitments() {
  try {
    const response = await api.get("/product-fitments");

    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Could not load fitments."
      )
    );
  }
}

/* ===========================================
   Bulk Upload
=========================================== */

export async function bulkUploadFitments(file) {
  try {
    const formData = new FormData();

    formData.append("file", file);

    const response = await api.post(
      "/fitment/bulk-upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Bulk upload failed."
      )
    );
  }
}

/* ===========================================
   Download Template
=========================================== */

export async function downloadFitmentTemplate() {
  try {
    const response = await api.get(
      "/fitment/template",
      {
        responseType: "blob",
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Could not download template."
      )
    );
  }
}

/* ===========================================
   Failed Report Download
=========================================== */

export async function downloadFailedReport(
  uploadResult
) {
  try {
    const payload = {
      totalRows: uploadResult.totalRows,
      successRows: uploadResult.successRows,
      skippedRows: uploadResult.skippedRows,
      failedRows: uploadResult.failedRows,
    };

    const response = await api.post(
      "/fitment/failed-report",
      payload,
      {
        responseType: "blob",
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Could not download failed report."
      )
    );
  }
}

export async function searchProducts(text) {
  try {
    const user = JSON.parse(localStorage.getItem("user"));

    const response = await api.get("/products/search", {
      params: {
        text,
        storeId: user?.storeId,
      },
    });

    // Supports both wrapped ({ data: [...] }) and non-wrapped ([...]) responses
    return response.data.data ?? response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Could not search products.")
    );
  }
}
