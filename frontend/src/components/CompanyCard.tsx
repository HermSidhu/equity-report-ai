import React from "react";
import { Card, Group, Text, Badge, Button, Stack } from "@mantine/core";
import { IconBuilding, IconWorld, IconTrendingUp } from "@tabler/icons-react";
import { Company } from "@/types";

interface CompanyCardProps {
  company: Company;
  onSelect: (company: Company) => void;
  isSelected?: boolean;
  disabled?: boolean;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({
  company,
  onSelect,
  isSelected = false,
  disabled = false,
}) => {
  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        borderColor: isSelected ? "#1c7ed6" : undefined,
        borderWidth: isSelected ? 2 : 1,
      }}
      onClick={() => !disabled && onSelect(company)}
    >
      <Stack gap="md">
        <Group justify="space-between">
          <Group>
            <IconBuilding size={24} color="#1c7ed6" />
            <div>
              <Text fw={600} size="lg">
                {company.name}
              </Text>
              <Text size="sm" c="dimmed">
                {company.ticker}
              </Text>
            </div>
          </Group>
          <Badge color="blue" variant="light">
            {company.exchange}
          </Badge>
        </Group>

        <Group>
          <IconWorld size={16} />
          <Text size="sm" c="dimmed">
            {company.country}
          </Text>
        </Group>

        <Button
          leftSection={<IconTrendingUp size={16} />}
          variant={isSelected ? "filled" : "light"}
          color="blue"
          size="sm"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(company);
          }}
        >
          {isSelected ? "Selected" : "Select Company"}
        </Button>
      </Stack>
    </Card>
  );
};
