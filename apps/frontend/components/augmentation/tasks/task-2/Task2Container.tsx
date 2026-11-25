"use client";

import React from "react";
import AugmentationStudio from "../../AugmentationStudio";

export const Task2Container: React.FC = () => {
  return (
    <AugmentationStudio
      showBackButton={true}
      backHref="/tools/augmentation"
    />
  );
};

export default Task2Container;
