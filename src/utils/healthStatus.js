// File này chứa logic đánh giá chỉ số sức khỏe.
// Đây chỉ là cảnh báo demo cho project CV, không thay thế tư vấn y tế thật.

export function getGlucoseStatus(glucose) {
  const value = Number(glucose);

  if (value >= 126) {
    return {
      label: "High",
      message: "High fasting glucose. Diabetes follow-up is recommended.",
      type: "danger",
    };
  }

  if (value >= 100) {
    return {
      label: "Warning",
      message: "Prediabetes range. Lifestyle adjustment is recommended.",
      type: "warning",
    };
  }

  return {
    label: "Normal",
    message: "Glucose level is within normal range.",
    type: "success",
  };
}

export function getHbA1cStatus(hba1c) {
  const value = Number(hba1c);

  if (value >= 6.5) {
    return {
      label: "Diabetes Risk",
      message: "HbA1c is in diabetes range.",
      type: "danger",
    };
  }

  if (value >= 5.7) {
    return {
      label: "Prediabetes",
      message: "HbA1c is in prediabetes range.",
      type: "warning",
    };
  }

  return {
    label: "Normal",
    message: "HbA1c is within normal range.",
    type: "success",
  };
}

export function getBmiStatus(bmi) {
  const value = Number(bmi);

  if (value >= 30) return { label: "Obese", type: "danger" };
  if (value >= 25) return { label: "Overweight", type: "warning" };
  if (value < 18.5) return { label: "Underweight", type: "warning" };

  return { label: "Normal", type: "success" };
}

export function getBloodPressureStatus(bloodPressure) {
  if (!bloodPressure || !bloodPressure.includes("/")) {
    return { label: "Unknown", type: "neutral" };
  }

  const [systolic, diastolic] = bloodPressure.split("/").map(Number);

  if (systolic >= 140 || diastolic >= 90) {
    return { label: "High", type: "danger" };
  }

  if (systolic >= 130 || diastolic >= 80) {
    return { label: "Warning", type: "warning" };
  }

  return { label: "Normal", type: "success" };
}
