import { useState, useEffect } from "react";
import {
  MantineProvider,
  AppShell,
  Title,
  Text,
  Container,
  Button,
  Group,
  Stack,
  Alert,
  ActionIcon,
  Tooltip,
  Card,
  Badge,
  Progress,
  Box,
  Loader,
  ThemeIcon,
  Accordion,
  Table,
  ScrollArea,
  Tabs,
} from "@mantine/core";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { Notifications, notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  IconDownload,
  IconChartBar,
  IconBrandGithub,
  IconAlertCircle,
  IconCheck,
} from "@tabler/icons-react";

import { downloadCSVFile } from "@/utils/api";
import { COMPANIES } from "../companies";

import { useConsolidatedData } from "@/hooks/useApi";

// Interfaces
interface DownloadedFile {
  filename: string;
  path: string;
  year: number | null;
  size: number;
  downloadedAt: string;
}

interface DownloadProgress {
  isProcessing: boolean;
  progress: number;
  status: string;
  stage: "download" | "parse" | "complete";
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function MainApp() {
  const [selectedCompany, setSelectedCompany] = useState<
    (typeof COMPANIES)[number] | null
  >(null);
  const [downloadProgress, setDownloadProgress] = useState<{
    [key: string]: DownloadProgress;
  }>({});
  const [downloadedFiles, setDownloadedFiles] = useState<{
    [key: string]: DownloadedFile[];
  }>({});

  // API hooks - only using consolidated data query
  const { data: consolidatedData, isLoading: dataLoading } =
    useConsolidatedData(selectedCompany?.id || "", !!selectedCompany);

  const companies = COMPANIES;

  // Helper function to create chart data for multiple metrics
  const createMultiMetricChartData = (
    data: Record<string, Record<string, number | string>>,
    metrics: string[],
    years: number[]
  ) => {
    return years
      .map((year) => {
        const dataPoint: {
          year: string;
          [key: string]: string | number | null;
        } = {
          year: year.toString(),
        };

        let hasAnyData = false;

        metrics.forEach((metric) => {
          const value = data[metric]?.[year.toString()];
          let numericValue: number | null = null;

          if (
            typeof value === "string" &&
            value !== "N/A" &&
            value.trim() !== ""
          ) {
            const parsed = parseFloat(value.replace(/,/g, ""));
            if (!isNaN(parsed)) {
              numericValue = parsed;
              hasAnyData = true;
            }
          } else if (typeof value === "number" && !isNaN(value)) {
            numericValue = value;
            hasAnyData = true;
          }

          dataPoint[metric] = numericValue;
        });

        return hasAnyData ? dataPoint : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  };

  // Helper function to create chart data
  const createChartData = (
    data: Record<string, Record<string, number | string>>,
    metric: string,
    years: number[]
  ) => {
    const chartData = years
      .map((year) => {
        const value = data[metric]?.[year.toString()];
        let numericValue: number | null = null;

        if (
          typeof value === "string" &&
          value !== "N/A" &&
          value.trim() !== ""
        ) {
          const parsed = parseFloat(value.replace(/,/g, ""));
          if (!isNaN(parsed)) {
            numericValue = parsed;
          }
        } else if (typeof value === "number" && !isNaN(value)) {
          numericValue = value;
        }

        return numericValue !== null
          ? {
              year: year.toString(),
              value: numericValue,
            }
          : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return chartData;
  };

  // Helper function to render financial data as table with chart
  const renderFinancialTable = (
    title: string,
    data: Record<string, Record<string, number | string>>,
    years: number[],
    chartMetric?: string,
    multiMetricChart?: { metrics: string[]; colors: string[] }
  ) => {
    const metrics = Object.keys(data);
    if (metrics.length === 0) return null;

    const chartData = multiMetricChart
      ? createMultiMetricChartData(data, multiMetricChart.metrics, years)
      : chartMetric
      ? createChartData(data, chartMetric, years)
      : [];

    return (
      <Card withBorder padding="lg" mt="md">
        <Title order={4} mb="md">
          {title} (in millions)
        </Title>
        <ScrollArea>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Metric</Table.Th>
                {years.map((year) => (
                  <Table.Th key={year} style={{ textAlign: "right" }}>
                    {year}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {metrics.map((metric) => {
                const isTotal = metric.toLowerCase().includes("total");
                const isNetIncome = metric.toLowerCase() === "net income";
                const isNetChangeInCash =
                  metric.toLowerCase() === "net change in cash";
                const shouldBeBold =
                  isTotal || isNetIncome || isNetChangeInCash;

                return (
                  <Table.Tr key={metric}>
                    <Table.Td
                      style={{ fontWeight: shouldBeBold ? "bold" : 500 }}
                    >
                      {metric}
                    </Table.Td>
                    {years.map((year) => {
                      const value = data[metric]?.[year.toString()];
                      let displayValue = value;

                      // Handle numeric values - keep in millions and format with commas
                      if (
                        typeof value === "string" &&
                        value !== "N/A" &&
                        !isNaN(parseFloat(value.replace(/,/g, "")))
                      ) {
                        const numericValue = parseFloat(
                          value.replace(/,/g, "")
                        );
                        displayValue = numericValue.toLocaleString("en-US");
                      } else if (typeof value === "number") {
                        displayValue = value.toLocaleString("en-US");
                      }

                      return (
                        <Table.Td
                          key={year}
                          style={{
                            textAlign: "right",
                            fontWeight: shouldBeBold ? "bold" : "normal",
                          }}
                        >
                          {displayValue || "N/A"}
                        </Table.Td>
                      );
                    })}
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>

        {/* Chart Section */}
        {((chartMetric && chartData.length > 0) ||
          (multiMetricChart && chartData.length > 0)) && (
          <Box mt="xl">
            <Title order={5} mb="md">
              {multiMetricChart
                ? `${multiMetricChart.metrics.join(" vs ")} Trend`
                : `${chartMetric} Trend`}
            </Title>
            <Box style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis
                    tickFormatter={(value) =>
                      value >= 1000
                        ? `${(value / 1000).toFixed(1)}B`
                        : value >= 1
                        ? `${value.toFixed(0)}M`
                        : value.toFixed(2)
                    }
                  />
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString("en-US")} million`,
                      name,
                    ]}
                    labelFormatter={(label) => `Year: ${label}`}
                  />
                  {multiMetricChart ? (
                    multiMetricChart.metrics.map((metric, index) => (
                      <Line
                        key={metric}
                        type="monotone"
                        dataKey={metric}
                        stroke={multiMetricChart.colors[index]}
                        strokeWidth={2}
                        dot={{
                          fill: multiMetricChart.colors[index],
                          strokeWidth: 2,
                          r: 4,
                        }}
                        activeDot={{
                          r: 6,
                          stroke: multiMetricChart.colors[index],
                          strokeWidth: 2,
                        }}
                      />
                    ))
                  ) : (
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#1c7ed6"
                      strokeWidth={2}
                      dot={{ fill: "#1c7ed6", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: "#1c7ed6", strokeWidth: 2 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        )}
      </Card>
    );
  };

  // Function to fetch downloaded files for a company
  const fetchDownloadedFiles = async (companyId: string) => {
    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_URL || "http://localhost:5050";
      const response = await fetch(
        `${API_BASE_URL}/api/annual_reports/${companyId}/files`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.statusText}`);
      }
      const data = await response.json();
      setDownloadedFiles((prev) => ({
        ...prev,
        [companyId]: data.files || [],
      }));
    } catch (error) {
      console.error("Failed to fetch downloaded files:", error);
      notifications.show({
        title: "Error",
        message: "Failed to fetch downloaded files",
        color: "red",
      });
    }
  };

  // Effect to fetch files when a company is selected
  useEffect(() => {
    if (selectedCompany) {
      fetchDownloadedFiles(selectedCompany.id);
    }
  }, [selectedCompany]);

  const handleDownloadAndParse = async (
    company: (typeof COMPANIES)[number]
  ) => {
    setDownloadProgress((prev) => ({
      ...prev,
      [company.id]: {
        isProcessing: true,
        progress: 0,
        status: "Starting download...",
        stage: "download",
      },
    }));

    try {
      // DOWNLOAD PHASE
      setDownloadProgress((prev) => ({
        ...prev,
        [company.id]: {
          ...prev[company.id],
          progress: 10,
          status: "Connecting to server...",
          stage: "download",
        },
      }));

      const API_BASE_URL =
        import.meta.env.VITE_API_URL || "http://localhost:5050";
      const downloadResponse = await fetch(
        `${API_BASE_URL}/api/annual_reports`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            companyName: company.id,
            irUrl: company.irUrl,
          }),
        }
      );

      setDownloadProgress((prev) => ({
        ...prev,
        [company.id]: {
          ...prev[company.id],
          progress: 30,
          status: "Scraping reports...",
          stage: "download",
        },
      }));

      if (!downloadResponse.ok) {
        throw new Error(`Download failed: ${downloadResponse.statusText}`);
      }

      const downloadResult = await downloadResponse.json();

      setDownloadProgress((prev) => ({
        ...prev,
        [company.id]: {
          ...prev[company.id],
          progress: 50,
          status: "Download complete! Starting AI parsing...",
          stage: "parse",
        },
      }));

      // Show download success notification
      notifications.show({
        title: "Download Complete",
        message: `Downloaded ${downloadResult.totalFiles} reports for ${company.name}. Now parsing...`,
        color: "blue",
        icon: <IconCheck size={16} />,
      });

      // Refresh the files list
      await fetchDownloadedFiles(company.id);

      // PARSE PHASE
      setDownloadProgress((prev) => ({
        ...prev,
        [company.id]: {
          ...prev[company.id],
          progress: 60,
          status: "AI is analyzing PDF reports...",
          stage: "parse",
        },
      }));

      const parseResponse = await fetch(
        `${API_BASE_URL}/api/parse/${company.id}`,
        {
          method: "POST",
        }
      );

      if (!parseResponse.ok) {
        throw new Error(`Parsing failed: ${parseResponse.statusText}`);
      }

      const parseResult = await parseResponse.json();

      setDownloadProgress((prev) => ({
        ...prev,
        [company.id]: {
          ...prev[company.id],
          progress: 90,
          status: "Extracting financial data...",
          stage: "parse",
        },
      }));

      // Final completion
      setDownloadProgress((prev) => ({
        ...prev,
        [company.id]: {
          ...prev[company.id],
          progress: 100,
          status: "Processing complete! Loading financial data...",
          stage: "complete",
        },
      }));

      // Show success notification
      notifications.show({
        title: "Processing Complete",
        message: `Successfully processed ${downloadResult.totalFiles} reports for ${company.name}`,
        color: "green",
        icon: <IconCheck size={16} />,
      });

      // Wait a moment then refresh data
      setTimeout(() => {
        setDownloadProgress((prev) => ({
          ...prev,
          [company.id]: {
            isProcessing: false,
            progress: 0,
            status: "",
            stage: "complete",
          },
        }));
      }, 2000);

      console.log("Download and parse successful:", {
        downloadResult,
        parseResult,
      });
    } catch (error) {
      console.error("Process failed:", error);

      notifications.show({
        title: "Processing Failed",
        message: error instanceof Error ? error.message : "An error occurred",
        color: "red",
      });

      setDownloadProgress((prev) => ({
        ...prev,
        [company.id]: {
          isProcessing: false,
          progress: 0,
          status: "",
          stage: "download",
        },
      }));
    }
  };

  const handleDownloadCSV = async (companyId: string) => {
    try {
      await downloadCSVFile(companyId);
    } catch (error) {
      console.error("CSV download failed:", error);
    }
  };

  if (false) {
    // Remove loading state since we're not using API
    return (
      <MantineProvider theme={{ primaryColor: "blue" }}>
        <AppShell>
          <Container size="lg" py="xl">
            <Group justify="center">
              <Loader />
              <Text>Loading companies...</Text>
            </Group>
          </Container>
        </AppShell>
      </MantineProvider>
    );
  }

  return (
    <MantineProvider theme={{ primaryColor: "blue" }}>
      <Notifications />

      <AppShell
        header={{ height: 70 }}
        navbar={{ width: 320, breakpoint: "sm" }}
        padding="md"
      >
        <AppShell.Header>
          <Container size="xl" h="100%">
            <Group justify="space-between" h="100%">
              <Group>
                <IconChartBar size={32} color="#1c7ed6" />
                <div>
                  <Title order={3} c="blue">
                    Equity Report AI
                  </Title>
                  <Text size="sm" c="dimmed">
                    Automated financial statement extraction
                  </Text>
                </div>
              </Group>

              <Group>
                <Badge variant="light" color="green">
                  {companies.length} Companies Available
                </Badge>

                <Tooltip label="View on GitHub">
                  <ActionIcon
                    variant="subtle"
                    component="a"
                    href="https://github.com/HermSidhu/equity-report-ai"
                    target="_blank"
                    size="lg"
                  >
                    <IconBrandGithub size={20} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          </Container>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <Stack gap="md">
            <Title order={3}>Companies</Title>

            <Stack gap="xs">
              {companies.map((company) => (
                <Card
                  key={company.id}
                  padding="sm"
                  radius="md"
                  withBorder
                  style={{
                    cursor: "pointer",
                    backgroundColor:
                      selectedCompany?.id === company.id
                        ? "var(--mantine-color-blue-1)"
                        : undefined,
                  }}
                  onClick={() => setSelectedCompany(company)}
                >
                  <Group justify="space-between">
                    <Stack gap={2}>
                      <Text fw={500} size="sm">
                        {company.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {company.exchange}
                      </Text>
                    </Stack>
                    <Badge variant="light" size="xs">
                      {company.ticker}
                    </Badge>
                  </Group>
                </Card>
              ))}
            </Stack>
          </Stack>
        </AppShell.Navbar>

        <AppShell.Main>
          <Container size="xl">
            {!selectedCompany ? (
              <Alert
                icon={<IconAlertCircle size={16} />}
                title="Select a Company"
                color="blue"
              >
                Choose a company from the sidebar to get started with
                downloading reports, parsing data, or viewing financial
                information.
              </Alert>
            ) : (
              <Stack gap="xl">
                <Group justify="space-between" align="flex-start">
                  <Box>
                    <Title order={2}>{selectedCompany.name}</Title>
                    <Group gap="xs" mt="xs">
                      <Badge variant="light" size="sm" color="blue">
                        {selectedCompany.ticker}
                      </Badge>
                      <Badge variant="outline" size="sm" color="green">
                        {selectedCompany.country}
                      </Badge>
                      <Badge variant="dot" size="sm" color="orange">
                        {selectedCompany.exchange}
                      </Badge>
                    </Group>
                  </Box>
                </Group>

                {/* Combined View - Download & Parse + Financial Data */}
                <Stack gap="md">
                  {/* Download & Parse Section */}
                  <Card withBorder padding="lg">
                    <Stack gap="md">
                      <Group justify="space-between" align="center">
                        <Box>
                          <Title order={3}>
                            Download & Parse Annual Reports
                          </Title>
                          <Text size="sm" c="dimmed" mt={4}>
                            Download annual reports and extract financial data
                            using AI in one step
                          </Text>
                        </Box>
                        <Button
                          onClick={() =>
                            handleDownloadAndParse(selectedCompany)
                          }
                          loading={
                            downloadProgress[selectedCompany.id]
                              ?.isProcessing || false
                          }
                          leftSection={<IconDownload size={16} />}
                          size="sm"
                        >
                          Download & Parse
                        </Button>
                      </Group>

                      {downloadProgress[selectedCompany.id]?.isProcessing && (
                        <Box>
                          <Group justify="space-between" mb="xs">
                            <Text size="sm">
                              {downloadProgress[selectedCompany.id]?.status ||
                                "Processing..."}
                            </Text>
                            <Badge
                              variant="light"
                              color={
                                downloadProgress[selectedCompany.id]?.stage ===
                                "download"
                                  ? "blue"
                                  : downloadProgress[selectedCompany.id]
                                      ?.stage === "parse"
                                  ? "orange"
                                  : "green"
                              }
                              size="sm"
                            >
                              {downloadProgress[selectedCompany.id]?.stage ===
                              "download"
                                ? "Downloading"
                                : downloadProgress[selectedCompany.id]
                                    ?.stage === "parse"
                                ? "Parsing"
                                : "Complete"}
                            </Badge>
                          </Group>
                          <Progress
                            value={
                              downloadProgress[selectedCompany.id]?.progress ||
                              0
                            }
                            animated
                            color={
                              downloadProgress[selectedCompany.id]?.stage ===
                              "download"
                                ? "blue"
                                : downloadProgress[selectedCompany.id]
                                    ?.stage === "parse"
                                ? "orange"
                                : "green"
                            }
                          />
                          <Text size="xs" c="dimmed" mt="xs">
                            {downloadProgress[selectedCompany.id]?.stage ===
                            "download"
                              ? "Downloading reports from investor relations page..."
                              : downloadProgress[selectedCompany.id]?.stage ===
                                "parse"
                              ? "AI is analyzing PDF reports and extracting financial data..."
                              : "Processing complete! Financial data will be available shortly."}
                          </Text>
                        </Box>
                      )}

                      <Alert color="blue" variant="light">
                        <Text size="sm">
                          <strong>Source:</strong> {selectedCompany.irUrl}
                        </Text>
                      </Alert>
                    </Stack>
                  </Card>

                  {/* Downloaded Files */}
                  <Accordion
                    variant="contained"
                    defaultValue="downloaded-reports"
                  >
                    <Accordion.Item value="downloaded-reports">
                      <Accordion.Control>
                        <Group justify="space-between" mr="xl">
                          <Text fw={500}>Reports Downloaded</Text>
                          <Badge variant="light" color="green" size="sm">
                            {downloadedFiles[selectedCompany.id]?.length || 0}{" "}
                            files
                          </Badge>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        {downloadedFiles[selectedCompany.id]?.length > 0 ? (
                          <Stack gap="xs">
                            {downloadedFiles[selectedCompany.id].map(
                              (file, index) => (
                                <Card
                                  key={index}
                                  withBorder
                                  padding="sm"
                                  radius="md"
                                >
                                  <Group justify="space-between">
                                    <Group>
                                      <ThemeIcon
                                        color="green"
                                        size={32}
                                        radius="xl"
                                      >
                                        <IconCheck size={16} />
                                      </ThemeIcon>
                                      <Box>
                                        <Text size="sm" fw={500}>
                                          {file.filename}
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                          {file.year && `Year: ${file.year} • `}
                                          Size:{" "}
                                          {(file.size / 1024 / 1024).toFixed(
                                            1
                                          )}{" "}
                                          MB • Downloaded & Parsed:{" "}
                                          {new Date(
                                            file.downloadedAt
                                          ).toLocaleDateString()}
                                        </Text>
                                      </Box>
                                    </Group>
                                    <Badge
                                      variant="light"
                                      size="xs"
                                      color="green"
                                    >
                                      {file.year || "Unknown Year"}
                                    </Badge>
                                  </Group>
                                </Card>
                              )
                            )}
                          </Stack>
                        ) : (
                          <Alert
                            icon={<IconAlertCircle size={16} />}
                            title="No Reports Processed"
                            color="yellow"
                          >
                            Click "Download & Parse" above to download and
                            process annual reports for {selectedCompany.name}.
                          </Alert>
                        )}
                      </Accordion.Panel>
                    </Accordion.Item>
                  </Accordion>

                  {/* Financial Data Section */}
                  <Card withBorder padding="lg">
                    <Stack gap="md">
                      <Group justify="space-between">
                        <Title order={3}>Financial Data</Title>
                        <Button
                          onClick={() => handleDownloadCSV(selectedCompany.id)}
                          variant="light"
                          size="sm"
                          leftSection={<IconDownload size={16} />}
                        >
                          Download CSV
                        </Button>
                      </Group>

                      {dataLoading ? (
                        <Group justify="center" py="xl">
                          <Loader />
                          <Text>Loading financial data...</Text>
                        </Group>
                      ) : consolidatedData ? (
                        <Stack gap="md">
                          <Alert
                            icon={<IconCheck size={16} />}
                            title="Data Loaded Successfully"
                            color="green"
                          >
                            Financial data loaded for {selectedCompany.name} •{" "}
                            {consolidatedData.years?.length || 0} years of data
                            available
                          </Alert>

                          <Tabs defaultValue="income" variant="outline">
                            <Tabs.List grow>
                              <Tabs.Tab value="income">
                                Income Statement
                              </Tabs.Tab>
                              <Tabs.Tab value="balance">Balance Sheet</Tabs.Tab>
                              <Tabs.Tab value="cashflow">Cash Flow</Tabs.Tab>
                            </Tabs.List>

                            <Tabs.Panel value="income">
                              {renderFinancialTable(
                                "Income Statement",
                                consolidatedData.incomeStatement || {},
                                consolidatedData.years || [],
                                "Net Income"
                              )}
                            </Tabs.Panel>

                            <Tabs.Panel value="balance">
                              {renderFinancialTable(
                                "Balance Sheet",
                                consolidatedData.balanceSheet || {},
                                consolidatedData.years || [],
                                undefined,
                                {
                                  metrics: [
                                    "Total Assets",
                                    "Total Liabilities",
                                    "Total Equity",
                                  ],
                                  colors: ["#28a745", "#dc3545", "#1c7ed6"], // Green for assets, red for liabilities, blue for equity
                                }
                              )}
                            </Tabs.Panel>

                            <Tabs.Panel value="cashflow">
                              {renderFinancialTable(
                                "Cash Flow Statement",
                                consolidatedData.cashFlow || {},
                                consolidatedData.years || [],
                                "Net Change in Cash"
                              )}
                            </Tabs.Panel>
                          </Tabs>
                        </Stack>
                      ) : (
                        <Alert
                          icon={<IconAlertCircle size={16} />}
                          title="No Data Available"
                          color="yellow"
                        >
                          Financial data is not yet available for{" "}
                          {selectedCompany.name}. Please ensure the reports have
                          been downloaded and parsed first.
                        </Alert>
                      )}
                    </Stack>
                  </Card>
                </Stack>
              </Stack>
            )}
          </Container>
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  );
}

export default App;
