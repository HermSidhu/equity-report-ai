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
  List,
  ThemeIcon,
  Accordion,
  Table,
  ScrollArea,
  Tabs,
} from "@mantine/core";
import { Notifications, notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  IconDownload,
  IconChartBar,
  IconBrandGithub,
  IconSun,
  IconMoon,
  IconFileText,
  IconTable,
  IconAlertCircle,
  IconFile,
  IconCheck,
} from "@tabler/icons-react";
import { useLocalStorage, useColorScheme } from "@mantine/hooks";

// import { ProgressTracker } from "@/components/ProgressTracker";
import { downloadCSVFile, downloadComparativeCSV } from "@/utils/api";
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
  isDownloading: boolean;
  progress: number;
  status: string;
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
  const [activeTab, setActiveTab] = useState<"download" | "parse" | "data">(
    "download"
  );
  const [downloadProgress, setDownloadProgress] = useState<{
    [key: string]: DownloadProgress;
  }>({});
  const [parseProgress, setParseProgress] = useState<{
    [key: string]: boolean;
  }>({});
  const [downloadedFiles, setDownloadedFiles] = useState<{
    [key: string]: DownloadedFile[];
  }>({});

  const preferredColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useLocalStorage({
    key: "mantine-color-scheme",
    defaultValue: preferredColorScheme,
    getInitialValueInEffect: true,
  });

  // API hooks - only using consolidated data query
  const { data: consolidatedData, isLoading: dataLoading } =
    useConsolidatedData(
      selectedCompany?.id || "",
      !!selectedCompany && activeTab === "data"
    );

  const companies = COMPANIES;

  // Helper function to render financial data as table
  const renderFinancialTable = (
    title: string,
    data: Record<string, Record<string, number | string>>,
    years: number[]
  ) => {
    const metrics = Object.keys(data);
    if (metrics.length === 0) return null;

    return (
      <Card withBorder padding="lg" mt="md">
        <Title order={4} mb="md">
          {title}
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
              {metrics.map((metric) => (
                <Table.Tr key={metric}>
                  <Table.Td style={{ fontWeight: 500 }}>{metric}</Table.Td>
                  {years.map((year) => {
                    const value = data[metric]?.[year.toString()];
                    return (
                      <Table.Td key={year} style={{ textAlign: "right" }}>
                        {typeof value === "number"
                          ? value.toLocaleString()
                          : value || "N/A"}
                      </Table.Td>
                    );
                  })}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>
    );
  };

  // Function to fetch downloaded files for a company
  const fetchDownloadedFiles = async (companyId: string) => {
    try {
      const response = await fetch(`/api/annual_reports/${companyId}/files`);
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

  // Effect to fetch files when company is selected
  useEffect(() => {
    if (selectedCompany) {
      fetchDownloadedFiles(selectedCompany.id);
    }
  }, [selectedCompany]);

  const handleDownload = async (company: (typeof COMPANIES)[number]) => {
    setDownloadProgress((prev) => ({
      ...prev,
      [company.id]: {
        isDownloading: true,
        progress: 0,
        status: "Starting download...",
      },
    }));

    try {
      // Update progress
      setDownloadProgress((prev) => ({
        ...prev,
        [company.id]: {
          ...prev[company.id],
          progress: 20,
          status: "Connecting to server...",
        },
      }));

      const response = await fetch("/api/annual_reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName: company.id,
          irUrl: company.irUrl,
        }),
      });

      setDownloadProgress((prev) => ({
        ...prev,
        [company.id]: {
          ...prev[company.id],
          progress: 50,
          status: "Scraping reports...",
        },
      }));

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      setDownloadProgress((prev) => ({
        ...prev,
        [company.id]: {
          ...prev[company.id],
          progress: 80,
          status: "Processing files...",
        },
      }));

      const result = await response.json();

      setDownloadProgress((prev) => ({
        ...prev,
        [company.id]: {
          ...prev[company.id],
          progress: 100,
          status: "Download complete!",
        },
      }));

      // Show success notification
      notifications.show({
        title: "Download Complete",
        message: `Downloaded ${result.totalFiles} reports for ${company.name}`,
        color: "green",
        icon: <IconCheck size={16} />,
      });

      // Refresh the files list
      await fetchDownloadedFiles(company.id);

      // Reset progress after a delay
      setTimeout(() => {
        setDownloadProgress((prev) => ({
          ...prev,
          [company.id]: {
            isDownloading: false,
            progress: 0,
            status: "",
          },
        }));
      }, 2000);

      console.log("Download successful:", result);
    } catch (error) {
      console.error("Download failed:", error);

      notifications.show({
        title: "Download Failed",
        message: error instanceof Error ? error.message : "An error occurred",
        color: "red",
      });

      setDownloadProgress((prev) => ({
        ...prev,
        [company.id]: {
          isDownloading: false,
          progress: 0,
          status: "",
        },
      }));
    }
  };

  const handleParse = async (companyId: string) => {
    setParseProgress((prev) => ({ ...prev, [companyId]: true }));
    try {
      const response = await fetch(`/api/parse/${companyId}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Parsing failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Parsing successful:", result);
    } catch (error) {
      console.error("Parsing failed:", error);
    } finally {
      setParseProgress((prev) => ({ ...prev, [companyId]: false }));
    }
  };

  const handleDownloadCSV = async (companyId: string) => {
    try {
      await downloadCSVFile(companyId);
    } catch (error) {
      console.error("CSV download failed:", error);
    }
  };

  const handleDownloadComparativeCSV = async () => {
    try {
      const companyIds = COMPANIES.map((c) => c.id);
      await downloadComparativeCSV(companyIds);
    } catch (error) {
      console.error("Comparative CSV download failed:", error);
    }
  };

  const toggleColorScheme = () => {
    setColorScheme(colorScheme === "dark" ? "light" : "dark");
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

                <Tooltip label="Toggle theme">
                  <ActionIcon
                    variant="subtle"
                    onClick={toggleColorScheme}
                    size="lg"
                  >
                    {colorScheme === "dark" ? (
                      <IconSun size={20} />
                    ) : (
                      <IconMoon size={20} />
                    )}
                  </ActionIcon>
                </Tooltip>

                <Tooltip label="View on GitHub">
                  <ActionIcon
                    variant="subtle"
                    component="a"
                    href="https://github.com/your-repo/equity-report-ai"
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
                        {company.id}
                      </Text>
                    </Stack>
                    <Badge variant="light" size="xs">
                      {company.id.toUpperCase()}
                    </Badge>
                  </Group>
                </Card>
              ))}
            </Stack>

            <Title order={4} mt="md">
              Actions
            </Title>

            <Stack gap="xs">
              <Button
                variant={activeTab === "download" ? "filled" : "light"}
                leftSection={<IconDownload size={16} />}
                onClick={() => setActiveTab("download")}
                size="sm"
              >
                Download Reports
              </Button>
              <Button
                variant={activeTab === "parse" ? "filled" : "light"}
                leftSection={<IconFileText size={16} />}
                onClick={() => setActiveTab("parse")}
                size="sm"
              >
                Parse PDFs
              </Button>
              <Button
                variant={activeTab === "data" ? "filled" : "light"}
                leftSection={<IconTable size={16} />}
                onClick={() => setActiveTab("data")}
                size="sm"
                disabled={!selectedCompany}
              >
                View Data
              </Button>
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
                      <Badge variant="light">
                        {selectedCompany.id.toUpperCase()}
                      </Badge>
                    </Group>
                  </Box>
                </Group>

                {/* Download Tab */}
                {activeTab === "download" && (
                  <Stack gap="md">
                    <Card withBorder padding="lg">
                      <Stack gap="md">
                        <Group justify="space-between" align="center">
                          <Box>
                            <Title order={3}>Download Annual Reports</Title>
                            <Text size="sm" c="dimmed" mt={4}>
                              Download the latest annual reports from the
                              company's investor relations page
                            </Text>
                          </Box>
                          <Button
                            onClick={() => handleDownload(selectedCompany)}
                            loading={
                              downloadProgress[selectedCompany.id]
                                ?.isDownloading || false
                            }
                            leftSection={<IconDownload size={16} />}
                            size="sm"
                          >
                            Start Download
                          </Button>
                        </Group>

                        {downloadProgress[selectedCompany.id]
                          ?.isDownloading && (
                          <Box>
                            <Text size="sm" mb="xs">
                              {downloadProgress[selectedCompany.id]?.status ||
                                "Downloading reports..."}
                            </Text>
                            <Progress
                              value={
                                downloadProgress[selectedCompany.id]
                                  ?.progress || 0
                              }
                              animated
                            />
                            <Text size="xs" c="dimmed" mt="xs">
                              This may take several minutes depending on the
                              number and size of reports
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
                            <Text fw={500}>Downloaded Reports</Text>
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
                                          color="blue"
                                          size={32}
                                          radius="xl"
                                        >
                                          <IconFile size={16} />
                                        </ThemeIcon>
                                        <Box>
                                          <Text size="sm" fw={500}>
                                            {file.filename}
                                          </Text>
                                          <Text size="xs" c="dimmed">
                                            {file.year &&
                                              `Year: ${file.year} • `}
                                            Size:{" "}
                                            {(file.size / 1024 / 1024).toFixed(
                                              1
                                            )}{" "}
                                            MB • Downloaded:{" "}
                                            {new Date(
                                              file.downloadedAt
                                            ).toLocaleDateString()}
                                          </Text>
                                        </Box>
                                      </Group>
                                      <Badge
                                        variant="light"
                                        size="xs"
                                        color={file.year ? "green" : "gray"}
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
                              title="No Reports Downloaded"
                              color="yellow"
                            >
                              Click "Start Download" above to download annual
                              reports for {selectedCompany.name}.
                            </Alert>
                          )}
                        </Accordion.Panel>
                      </Accordion.Item>
                    </Accordion>
                  </Stack>
                )}

                {/* Parse Tab */}
                {activeTab === "parse" && (
                  <Stack gap="md">
                    <Card withBorder padding="lg">
                      <Stack gap="md">
                        <Group justify="space-between" align="center">
                          <Box>
                            <Title order={3}>Parse PDF Reports</Title>
                            <Text size="sm" c="dimmed" mt={4}>
                              Extract financial data from downloaded PDF reports
                              using AI
                            </Text>
                          </Box>
                          <Button
                            onClick={() => handleParse(selectedCompany.id)}
                            loading={parseProgress[selectedCompany.id]}
                            leftSection={<IconFileText size={16} />}
                            size="sm"
                            disabled={
                              !downloadedFiles[selectedCompany.id]?.length
                            }
                          >
                            Start Parsing
                          </Button>
                        </Group>

                        {parseProgress[selectedCompany.id] && (
                          <Box>
                            <Text size="sm" mb="xs">
                              Parsing PDFs with AI...
                            </Text>
                            <Progress value={30} animated />
                            <Text size="xs" c="dimmed" mt="xs">
                              AI is analyzing the reports to extract financial
                              statements
                            </Text>
                          </Box>
                        )}

                        <Alert color="yellow" variant="light">
                          <Text size="sm">
                            Ensure reports have been downloaded before starting
                            the parsing process.
                          </Text>
                        </Alert>
                      </Stack>
                    </Card>

                    {/* Available Files for Parsing */}
                    <Card withBorder padding="lg">
                      <Stack gap="md">
                        <Group justify="space-between" align="center">
                          <Title order={4}>Reports Available for Parsing</Title>
                          <Badge variant="light" color="blue">
                            {downloadedFiles[selectedCompany.id]?.length || 0}{" "}
                            available
                          </Badge>
                        </Group>

                        {downloadedFiles[selectedCompany.id]?.length > 0 ? (
                          <List spacing="xs" size="sm">
                            {downloadedFiles[selectedCompany.id].map(
                              (file, index) => (
                                <List.Item
                                  key={index}
                                  icon={
                                    <ThemeIcon
                                      color="orange"
                                      size={24}
                                      radius="xl"
                                    >
                                      <IconFileText size={12} />
                                    </ThemeIcon>
                                  }
                                >
                                  <Group justify="space-between">
                                    <Box>
                                      <Text size="sm" fw={500}>
                                        {file.filename}
                                      </Text>
                                      <Text size="xs" c="dimmed">
                                        Ready for AI parsing •{" "}
                                        {(file.size / 1024 / 1024).toFixed(1)}{" "}
                                        MB
                                      </Text>
                                    </Box>
                                    <Badge
                                      variant="light"
                                      size="xs"
                                      color="orange"
                                    >
                                      {file.year || "Unknown Year"}
                                    </Badge>
                                  </Group>
                                </List.Item>
                              )
                            )}
                          </List>
                        ) : (
                          <Alert
                            icon={<IconAlertCircle size={16} />}
                            title="No Reports Available"
                            color="yellow"
                          >
                            Download annual reports first from the "Download
                            Reports" tab to make them available for parsing.
                          </Alert>
                        )}
                      </Stack>
                    </Card>
                  </Stack>
                )}

                {/* Data Tab */}
                {activeTab === "data" && (
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
                            <Tabs.Tab value="income">Income Statement</Tabs.Tab>
                            <Tabs.Tab value="balance">Balance Sheet</Tabs.Tab>
                            <Tabs.Tab value="cashflow">Cash Flow</Tabs.Tab>
                          </Tabs.List>

                          <Tabs.Panel value="income">
                            {renderFinancialTable(
                              "Income Statement",
                              consolidatedData.incomeStatement || {},
                              consolidatedData.years || []
                            )}
                          </Tabs.Panel>

                          <Tabs.Panel value="balance">
                            {renderFinancialTable(
                              "Balance Sheet",
                              consolidatedData.balanceSheet || {},
                              consolidatedData.years || []
                            )}
                          </Tabs.Panel>

                          <Tabs.Panel value="cashflow">
                            {renderFinancialTable(
                              "Cash Flow Statement",
                              consolidatedData.cashFlow || {},
                              consolidatedData.years || []
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
                )}
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
