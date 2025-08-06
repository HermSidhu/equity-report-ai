import React from "react";
import {
  Table,
  Card,
  Title,
  ScrollArea,
  Text,
  Badge,
  Group,
} from "@mantine/core";
import { ConsolidatedData } from "@/types";

interface FinancialTableProps {
  title: string;
  data: Record<string, Record<string, number | string>>;
  years: number[];
  type: "income" | "balance" | "cashflow";
}

const formatValue = (value: number | string | null) => {
  if (value === null || value === "") return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    // Format large numbers in millions/billions
    if (Math.abs(value) >= 1e9) {
      return `$${(value / 1e9).toFixed(1)}B`;
    } else if (Math.abs(value) >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1e3) {
      return `$${(value / 1e3).toFixed(1)}K`;
    } else {
      return `$${value.toLocaleString()}`;
    }
  }
  return value;
};

const getRowColor = (
  lineItem: string,
  type: "income" | "balance" | "cashflow"
) => {
  const item = lineItem.toLowerCase();

  if (type === "income") {
    if (item.includes("revenue") || item.includes("sales")) return "#e7f5ff";
    if (item.includes("gross profit")) return "#d0ebff";
    if (item.includes("operating income")) return "#a5d8ff";
    if (item.includes("net income")) return "#74c0fc";
  } else if (type === "balance") {
    if (item.includes("total assets")) return "#e7f5ff";
    if (item.includes("total liabilities")) return "#ffe0e6";
    if (item.includes("total equity")) return "#d0ebff";
  } else if (type === "cashflow") {
    if (item.includes("operating")) return "#e7f5ff";
    if (item.includes("investing")) return "#fff0e6";
    if (item.includes("financing")) return "#e6fcf5";
  }

  return undefined;
};

export const FinancialTable: React.FC<FinancialTableProps> = ({
  title,
  data,
  years,
  type,
}) => {
  if (!data || Object.keys(data).length === 0) {
    return (
      <Card withBorder padding="lg">
        <Title order={3} mb="md">
          {title}
        </Title>
        <Text c="dimmed" ta="center" py="xl">
          No data available for {title.toLowerCase()}
        </Text>
      </Card>
    );
  }

  const headerRow = (
    <Table.Tr>
      <Table.Th style={{ minWidth: 200 }}>Line Item</Table.Th>
      {years.map((year) => (
        <Table.Th key={year} ta="right">
          {year}
        </Table.Th>
      ))}
    </Table.Tr>
  );

  const rows = Object.entries(data).map(([lineItem, yearData]) => (
    <Table.Tr
      key={lineItem}
      style={{ backgroundColor: getRowColor(lineItem, type) }}
    >
      <Table.Td fw={500}>{lineItem}</Table.Td>
      {years.map((year) => {
        const value = yearData[year];
        const isNegative = typeof value === "number" && value < 0;

        return (
          <Table.Td key={year} ta="right" c={isNegative ? "red" : undefined}>
            {formatValue(value)}
          </Table.Td>
        );
      })}
    </Table.Tr>
  ));

  return (
    <Card withBorder padding="lg">
      <Group justify="space-between" mb="md">
        <Title order={3}>{title}</Title>
        <Badge color="blue" variant="light">
          {Object.keys(data).length} line items
        </Badge>
      </Group>

      <ScrollArea>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>{headerRow}</Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </ScrollArea>
    </Card>
  );
};

interface ConsolidatedViewProps {
  data: ConsolidatedData;
  companyName: string;
}

export const ConsolidatedView: React.FC<ConsolidatedViewProps> = ({
  data,
  companyName,
}) => {
  return (
    <div>
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>{companyName} Financial Statements</Title>
          <Text c="dimmed" size="lg">
            10-Year Consolidated View ({data.years[data.years.length - 1]} -{" "}
            {data.years[0]})
          </Text>
        </div>
        <Badge size="lg" color="green" variant="light">
          {data.years.length} years of data
        </Badge>
      </Group>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <FinancialTable
          title="Income Statement"
          data={data.incomeStatement}
          years={data.years}
          type="income"
        />

        <FinancialTable
          title="Balance Sheet"
          data={data.balanceSheet}
          years={data.years}
          type="balance"
        />

        <FinancialTable
          title="Cash Flow Statement"
          data={data.cashFlow}
          years={data.years}
          type="cashflow"
        />
      </div>
    </div>
  );
};
