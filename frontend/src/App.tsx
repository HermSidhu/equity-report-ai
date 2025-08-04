import React, { useState } from "react";
import {
  MantineProvider,
  AppShell,
  Title,
  Text,
  Container,
  Grid,
  Button,
  Group,
  Stack,
  LoadingOverlay,
  Alert,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  IconDownload,
  IconRefresh,
  IconChartBar,
  IconBrandGithub,
  IconSun,
  IconMoon,
} from "@tabler/icons-react";
import { useLocalStorage, useColorScheme } from "@mantine/hooks";

import { CompanyCard } from "@/components/CompanyCard";
import { ProgressTracker } from "@/components/ProgressTracker";
import { ConsolidatedView } from "@/components/FinancialTable";

import {
  useCompanies,
  useScrapeCompany,
  useScrapeStatus,
  useParseCompany,
  useParseStatus,
  useAggregateCompany,
  useConsolidatedData,
  useDownloadData,
} from "@/hooks/useApi";

import { Company } from "@/types";

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
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [currentStage, setCurrentStage] = useState<
    "idle" | "scraping" | "parsing" | "aggregating" | "completed"
  >("idle");

  const preferredColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useLocalStorage({
    key: "mantine-color-scheme",
    defaultValue: preferredColorScheme,
    getInitialValueInEffect: true,
  });

  // API hooks
  const { data: companiesResponse, isLoading: loadingCompanies } =
    useCompanies();
  const scrapeCompanyMutation = useScrapeCompany();
  const parseCompanyMutation = useParseCompany();
  const aggregateCompanyMutation = useAggregateCompany();
  const downloadMutation = useDownloadData();

  // Status tracking
  const { data: scrapeStatus } = useScrapeStatus(
    selectedCompany?.id || "",
    currentStage === "scraping"
  );

  const { data: parseStatus } = useParseStatus(
    selectedCompany?.id || "",
    currentStage === "parsing"
  );

  // Consolidated data
  const { data: consolidatedResponse, refetch: refetchData } =
    useConsolidatedData(
      selectedCompany?.id || "",
      currentStage === "completed"
    );

  const companies = companiesResponse?.data || [];
  const consolidatedData = consolidatedResponse?.data;

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
    setCurrentStage("idle");
  };

  const handleStartProcess = async () => {
    if (!selectedCompany) return;

    try {
      // Start scraping
      setCurrentStage("scraping");
      await scrapeCompanyMutation.mutateAsync(selectedCompany.id);

      // Wait for scraping to complete, then start parsing
      const waitForScraping = () => {
        const interval = setInterval(() => {
          if (scrapeStatus?.data?.stage === "completed") {
            clearInterval(interval);
            setCurrentStage("parsing");
            parseCompanyMutation.mutate(selectedCompany.id);
          } else if (scrapeStatus?.data?.stage === "error") {
            clearInterval(interval);
            setCurrentStage("idle");
          }
        }, 2000);
      };

      waitForScraping();
    } catch (error) {
      setCurrentStage("idle");
    }
  };

  const handleStartAggregation = async () => {
    if (!selectedCompany) return;

    setCurrentStage("aggregating");
    try {
      await aggregateCompanyMutation.mutateAsync(selectedCompany.id);
      setCurrentStage("completed");
      refetchData();
    } catch (error) {
      setCurrentStage("idle");
    }
  };

  const handleDownload = (format: "csv" | "excel") => {
    if (!selectedCompany) return;

    downloadMutation.mutate({
      companyId: selectedCompany.id,
      format,
    });
  };

  const toggleColorScheme = () => {
    setColorScheme(colorScheme === "dark" ? "light" : "dark");
  };

  const isProcessing = ["scraping", "parsing", "aggregating"].includes(
    currentStage
  );
  const currentProgress = scrapeStatus?.data || parseStatus?.data;

  return (
    <MantineProvider theme={{ colorScheme }} withGlobalStyles withNormalizeCSS>
      <Notifications />

      <AppShell header={{ height: 70 }} padding="md">
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
                    Automated financial statement extraction for publicly traded
                    companies
                  </Text>
                </div>
              </Group>

              <Group>
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

        <AppShell.Main>
          <Container size="xl">
            <LoadingOverlay visible={loadingCompanies} />

            {/* Company Selection */}
            <Stack gap="xl">
              <div>
                <Title order={2} mb="md">
                  Select Company
                </Title>
                <Grid>
                  {companies.map((company) => (
                    <Grid.Col
                      key={company.id}
                      span={{ base: 12, md: 6, lg: 4 }}
                    >
                      <CompanyCard
                        company={company}
                        onSelect={handleCompanySelect}
                        isSelected={selectedCompany?.id === company.id}
                        disabled={isProcessing}
                      />
                    </Grid.Col>
                  ))}
                </Grid>
              </div>

              {/* Processing Controls */}
              {selectedCompany && (
                <div>
                  <Title order={2} mb="md">
                    Processing Pipeline
                  </Title>

                  <Group mb="md">
                    <Button
                      onClick={handleStartProcess}
                      disabled={isProcessing}
                      loading={currentStage === "scraping"}
                      size="md"
                    >
                      Start Scraping & Parsing
                    </Button>

                    <Button
                      onClick={handleStartAggregation}
                      disabled={isProcessing || currentStage === "idle"}
                      loading={currentStage === "aggregating"}
                      variant="light"
                      size="md"
                    >
                      Aggregate Data
                    </Button>

                    <Button
                      onClick={() => refetchData()}
                      variant="subtle"
                      leftSection={<IconRefresh size={16} />}
                      disabled={isProcessing}
                    >
                      Refresh
                    </Button>
                  </Group>

                  {/* Progress Tracking */}
                  {currentProgress && isProcessing && (
                    <ProgressTracker
                      progress={currentProgress}
                      companyName={selectedCompany.name}
                    />
                  )}
                </div>
              )}

              {/* Results */}
              {consolidatedData && currentStage === "completed" && (
                <div>
                  <Group justify="space-between" mb="md">
                    <Title order={2}>Financial Statements</Title>
                    <Group>
                      <Button
                        leftSection={<IconDownload size={16} />}
                        onClick={() => handleDownload("csv")}
                        variant="light"
                        loading={downloadMutation.isPending}
                      >
                        Download CSV
                      </Button>
                      <Button
                        leftSection={<IconDownload size={16} />}
                        onClick={() => handleDownload("excel")}
                        color="green"
                        loading={downloadMutation.isPending}
                      >
                        Download Excel
                      </Button>
                    </Group>
                  </Group>

                  <ConsolidatedView
                    data={consolidatedData}
                    companyName={selectedCompany?.name || ""}
                  />
                </div>
              )}

              {/* Error States */}
              {currentStage === "idle" &&
                selectedCompany &&
                !consolidatedData && (
                  <Alert color="blue" title="Ready to process">
                    Click "Start Scraping & Parsing" to begin extracting
                    financial data for {selectedCompany.name}.
                  </Alert>
                )}
            </Stack>
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
