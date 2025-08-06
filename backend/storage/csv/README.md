# CSV Storage Directory

This directory contains generated CSV files for financial data export.

## Structure

- **`{company}_test.csv`** - Individual company financial data from test runs
- **`comparison_{company1}_{company2}_test.csv`** - Multi-company comparison files from test runs
- **User-generated exports** - CSV files downloaded via the API endpoints

## Generated Files

CSV files are automatically generated and stored here when:

1. Running `npm run test:csv` (creates test files)
2. Making requests to `/api/csv/download/:company` endpoints
3. Making requests to `/api/csv/compare` endpoints

## File Format

### Individual Company CSV

```
Statement,Item,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024
Income Statement,Revenue,"107,927","111,780",...
Balance Sheet,Total Assets,"91,799","97,539",...
```

### Comparative CSV

```
Statement,Item,Year,Company1,Company2,Company3
Income Statement,Revenue,2015,"107,927","44,389","N/A"
Income Statement,Revenue,2016,"111,780","36,195","N/A"
```

## Cleanup

Files in this directory are excluded from git tracking. You can safely delete test files as needed.
