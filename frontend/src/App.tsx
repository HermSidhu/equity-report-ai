import { useState } from "react";
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
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
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
} from "@tabler/icons-react";
import { useLocalStorage, useColorScheme } from "@mantine/hooks";

// import { ProgressTracker } from "@/components/ProgressTracker";
import { downloadCSVFile, downloadComparativeCSV } from "@/utils/api";
import { COMPANIES } from "../companies";

import { useConsolidatedData } from "@/hooks/useApi";

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
    [key: string]: boolean;
  }>({});
  const [parseProgress, setParseProgress] = useState<{
    [key: string]: boolean;
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

  const handleDownload = async (company: (typeof COMPANIES)[number]) => {
    setDownloadProgress((prev) => ({ ...prev, [company.id]: true }));
    try {
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

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Download successful:", result);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloadProgress((prev) => ({ ...prev, [company.id]: false }));
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
                          loading={downloadProgress[selectedCompany.id]}
                          leftSection={<IconDownload size={16} />}
                          size="sm"
                        >
                          Start Download
                        </Button>
                      </Group>

                      {downloadProgress[selectedCompany.id] && (
                        <Box>
                          <Text size="sm" mb="xs">
                            Downloading reports...
                          </Text>
                          <Progress value={50} animated />
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
                )}

                {/* Parse Tab */}
                {activeTab === "parse" && (
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
                )}

                {/* Data Tab */}
                {activeTab === "data" && (
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Title order={3}>Financial Data</Title>
                      <Group>
                        <Button
                          onClick={() => handleDownloadCSV(selectedCompany.id)}
                          variant="light"
                          size="sm"
                          leftSection={<IconDownload size={16} />}
                        >
                          Download CSV
                        </Button>
                        <Button
                          onClick={handleDownloadComparativeCSV}
                          variant="outline"
                          size="sm"
                          leftSection={<IconTable size={16} />}
                        >
                          Compare All
                        </Button>
                      </Group>
                    </Group>

                    {dataLoading ? (
                      <Group justify="center" py="xl">
                        <Loader />
                        <Text>Loading financial data...</Text>
                      </Group>
                    ) : consolidatedData ? (
                      <Card withBorder padding="lg">
                        <Text>
                          Financial data loaded successfully for{" "}
                          {selectedCompany.name}
                        </Text>
                        <Text size="sm" c="dimmed" mt="xs">
                          Data structure:{" "}
                          {JSON.stringify(
                            Object.keys(consolidatedData),
                            null,
                            2
                          )}
                        </Text>
                      </Card>
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
