import React from "react";
import {
  Progress,
  Card,
  Text,
  Stack,
  Group,
  Badge,
  Alert,
} from "@mantine/core";
import {
  IconInfoCircle,
  IconCheck,
  IconX,
  IconLoader,
} from "@tabler/icons-react";
import { ScrapingProgress } from "@/types";

interface ProgressTrackerProps {
  progress: ScrapingProgress;
  companyName: string;
}

const getStageInfo = (stage: ScrapingProgress["stage"]) => {
  switch (stage) {
    case "idle":
      return { label: "Ready", color: "gray", icon: IconInfoCircle };
    case "scraping":
      return { label: "Scraping Reports", color: "blue", icon: IconLoader };
    case "parsing":
      return { label: "Parsing PDFs", color: "orange", icon: IconLoader };
    case "aggregating":
      return { label: "Consolidating Data", color: "yellow", icon: IconLoader };
    case "completed":
      return { label: "Completed", color: "green", icon: IconCheck };
    case "error":
      return { label: "Error", color: "red", icon: IconX };
    default:
      return { label: "Unknown", color: "gray", icon: IconInfoCircle };
  }
};

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  progress,
  companyName,
}) => {
  const stageInfo = getStageInfo(progress.stage);
  const IconComponent = stageInfo.icon;

  return (
    <Card withBorder padding="lg" radius="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Group>
            <IconComponent
              size={20}
              color={
                stageInfo.color === "gray"
                  ? "#868e96"
                  : stageInfo.color === "blue"
                  ? "#1c7ed6"
                  : stageInfo.color === "orange"
                  ? "#fd7e14"
                  : stageInfo.color === "yellow"
                  ? "#fab005"
                  : stageInfo.color === "green"
                  ? "#51cf66"
                  : "#ff6b6b"
              }
            />
            <Text fw={600}>{companyName} Processing</Text>
          </Group>
          <Badge color={stageInfo.color} variant="light">
            {stageInfo.label}
          </Badge>
        </Group>

        <div>
          <Group justify="space-between" mb="xs">
            <Text size="sm">{progress.message}</Text>
            <Text size="sm" c="dimmed">
              {progress.progress}%
            </Text>
          </Group>
          <Progress
            value={progress.progress}
            color={stageInfo.color}
            size="md"
            radius="sm"
          />
        </div>

        {progress.currentFile && (
          <Alert
            icon={<IconInfoCircle size={16} />}
            color="blue"
            variant="light"
          >
            Current file: {progress.currentFile}
          </Alert>
        )}

        {progress.filesFound && (
          <Group>
            <Text size="sm" c="dimmed">
              Files found: {progress.filesFound}
            </Text>
            {progress.filesParsed && (
              <Text size="sm" c="dimmed">
                • Parsed: {progress.filesParsed}
              </Text>
            )}
          </Group>
        )}

        {progress.stage === "error" && (
          <Alert icon={<IconX size={16} />} color="red" variant="light">
            {progress.message}
          </Alert>
        )}
      </Stack>
    </Card>
  );
};
