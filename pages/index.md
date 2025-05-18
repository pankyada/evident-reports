**LLM Models Value Analysis**

---

# Executive Summary

This report analyzes language models from OpenRouter, identifying best-value models, optimal context windows, and task-specific champions based on cost and performance metrics.
<Grid cols=2>
    <Group>
        <BigValue data={recommendations} value="best_value_model" title="Best Overall Value"/>
        <BigValue data={recommendations} value="best_context_model" title="Best for Large Context"/>
   </Group>
    <Group>
        <BigValue data={recommendations} value="best_creative_model" title="Top Creative"/>
        <BigValue data={recommendations} value="best_analysis_model" title="Top Analysis"/>
    </Group>
</Grid>

# Table of Contents

1. [Available Models Overview](#available-models-overview)
2. [Value Analysis](#value-analysis)
3. [Context Window Comparison](#context-window-comparison)
4. [Task-Specific Model Categories](#task-specific-model-categories)

   * [Creative Tasks](#creative-tasks)
   * [Analysis Tasks](#analysis-tasks)
5. [Cost Calculator](#cost-calculator)
6. [Provider Comparison](#provider-comparison)
7. [Multimodal Models](#multimodal-models)
8. [Recommendations](#recommendations)
9. [About This Report](#about-this-report)

---

## Available Models Overview

Lists all LLMs exposed by OpenRouter, including pricing and context capacities.

```sql all_models
select
  *
from openroutermodels.get_models
```

<DataTable data={all_models} search="true" sort="context_length desc">
  <Column id="name" title="Model Name"/>
  <Column id="context_length" title="Context Length"/>
  <Column id="prompt_price" title="Prompt Cost" format="$0.000000/1K tokens"/>
  <Column id="completion_price" title="Completion Cost" format="$0.000000/1K tokens"/>
  <Column id="free" title="Free Tier Available"/>
</DataTable>

---

## Value Analysis

Identifies the most cost-effective models by ranking average prompt and completion costs.

```sql value_models
select
  name,
  context_length,
  prompt_price * 1000 as prompt_cost,
  completion_price * 1000 as completion_cost,
  (cast(prompt_price as float) + cast(completion_price as float))/2 as avg_cost_per_token
from openroutermodels.get_models
where prompt_cost > 0 and prompt_cost < 0.01
order by avg_cost_per_token asc, context_length desc
```

<ScatterPlot
data={value_models}
x="prompt_cost"
y="completion_cost"
title="Prompt vs Completion Cost"
xLabel="Prompt Cost ($/1K tokens)"
yLabel="Completion Cost ($/1K tokens)"
tooltipTitle="name"
yLog="true"
/>

---

## Context Window Comparison

Compares models by maximum context lengths, grouped into categories.

```sql context_length
select
  name,
  context_length,
  case
    when context_length >= 200000 then 'Very Large (>200K)'
    when context_length >= 100000 then 'Large (100K–200K)'
    when context_length >= 32000 then 'Medium (32K–100K)'
    else 'Small (<32K)'
  end as size_category
from openroutermodels.get_models
order by context_length desc
limit 15
```

<BarChart
data={context_length}
x="name"
y="context_length"
title="Context Window Size by Model"
sort="values"
color="size_category"
yFmt="#,##0"
xAxis={false}
/>

---

## Task-Specific Model Categories

### Creative Tasks

Models suited for brainstorming, storytelling, and generative creativity.

```sql creative_models
select
  name,
  description,
  context_length,
  prompt_price as prompt_cost,
  completion_price as completion_cost
from openroutermodels.get_models
where (description ilike '%creative%' or description ilike '%advanced reasoning%')
  and (name ilike '%claude%' or name ilike '%gpt%' or name ilike '%gemini%')
order by completion_cost asc
limit 10
```

<BigValue data={creative_models} value="name" title="Top Creative Model"/>

<DataTable data={creative_models}>
  <Column id="name" title="Model"/>
  <Column id="context_length" title="Context Length"/>
  <Column id="completion_cost" title="Generation Cost" format="$0.0000/1K tokens"/>
</DataTable>

### Analysis Tasks

Models optimized for data parsing, summarization, and complex reasoning.

```sql analysis_models
select
  name,
  context_length,
  prompt_price as prompt_cost,
  completion_price as completion_cost
from openroutermodels.get_models
where context_length > 8000
order by prompt_cost asc, context_length desc
limit 5
```

<BigValue data={analysis_models} value="name" title="Top Analysis Model"/>

<DataTable data={analysis_models}>
  <Column id="name" title="Model"/>
  <Column id="context_length" title="Context Length"/>
  <Column id="prompt_cost" title="Input Cost" format="$0.0000/1K tokens"/>
</DataTable>

---

## Cost Calculator

Estimates total costs for processing 10K tokens of prompts and completions across models.

```sql cost_calc
select
  name,
  prompt_price * 10 as cost_10k_prompt,
  completion_price * 10 as cost_10k_completion,
  (prompt_price + completion_price) * 10 as total_cost_10k_tokens
from openroutermodels.get_models
where prompt_price > 0
order by total_cost_10k_tokens asc
limit 30
```

<BigValue data={cost_calc} value="name" title="Lowest 10K-Token Cost" valueFmt="$0.00"/>

<BarChart
data={cost_calc}
x="name"
y={["cost_10k_prompt", "cost_10k_completion"]}
title="Cost Breakdown for 10K Tokens"
yFmt="$0.00"
sort="values"
xAxis={false}
legend={true}
/>

---

## Provider Comparison

Summarizes model counts, average context lengths, and pricing by provider.

```sql provider_models
select
  case
    when id ilike '%openai%' then 'OpenAI'
    when id ilike '%anthropic%' then 'Anthropic'
    when id ilike '%google%' then 'Google'
    else 'Other'
  end as provider,
  count(*) as model_count,
  avg(context_length) as avg_context_length,
  avg(prompt_price + completion_price) as avg_total_price
from openroutermodels.get_models
group by provider
order by model_count desc
```

<LineChart
data={provider_models}
x="provider"
y={["model_count", "avg_context_length", "avg_total_price"]}
title="Provider Comparison"
dualAxis={true}
yFmt="#,##0"
/>

---

## Multimodal Models

Highlights models supporting multimodal inputs sorted by combined cost.

```sql multimodal_models
select
  name,
  context_length,
  prompt_price,
  completion_price
from openroutermodels.get_models
where is_multimodal
order by (prompt_price + completion_price) asc
```

<BarChart
data={multimodal_models}
x="name"
y={["prompt_price", "completion_price"]}
title="Multimodal Model Costs"
yFmt="\$0.00000"
sort="values"
/>

---

## Recommendations

```sql recommendations
WITH best_value_cte AS (
  SELECT name
  FROM openroutermodels.get_models
  WHERE prompt_price IS NOT NULL
    AND completion_price IS NOT NULL
  ORDER BY (CAST(prompt_price AS FLOAT) + CAST(completion_price AS FLOAT)) / 2
    ASC,
    context_length DESC
  LIMIT 1
),
best_context_cte AS (
  SELECT name
  FROM openroutermodels.get_models
  WHERE context_length IS NOT NULL
  ORDER BY context_length DESC
  LIMIT 1
),
best_creative_cte AS (
  SELECT name
  FROM openroutermodels.get_models
  WHERE (name ILIKE '%claude%'
     OR name ILIKE '%gpt%'
     OR name ILIKE '%gemini%')
    AND completion_price IS NOT NULL
  ORDER BY CAST(completion_price AS FLOAT) ASC
  LIMIT 1
),
best_analysis_cte AS (
  SELECT name
  FROM openroutermodels.get_models
  WHERE context_length > 8000
    AND prompt_price IS NOT NULL
  ORDER BY CAST(prompt_price AS FLOAT) ASC,
    context_length DESC
  LIMIT 1
)
SELECT
  (SELECT name FROM best_value_cte)    AS best_value_model,
  (SELECT name FROM best_context_cte)  AS best_context_model,
  (SELECT name FROM best_creative_cte) AS best_creative_model,
  (SELECT name FROM best_analysis_cte) AS best_analysis_model;
```
<Grid cols=2>
    <Group>
        <BigValue data={recommendations} value="best_value_model" title="Best Overall Value"/>
        <BigValue data={recommendations} value="best_context_model" title="Best for Large Context"/>
   </Group>
    <Group>
        <BigValue data={recommendations} value="best_creative_model" title="Top Creative"/>
        <BigValue data={recommendations} value="best_analysis_model" title="Top Analysis"/>
    </Group>
</Grid>

<!-- <DataTable data={recommendations}>
  <Column id="best_value_model" title="Best Overall Value"/>
  <Column id="best_context_model" title="Best for Large Context"/>
  <Column id="best_creative_model" title="Top Creative"/>
  <Column id="best_analysis_model" title="Top Analysis"/>
</DataTable> -->

<Details title="About This Report">
This analysis is based on quantitative metrics—pricing and context capacity—sourced from the OpenRouter API. For production use, evaluate qualitative factors such as response quality, latency, and domain alignment alongside these metrics.
</Details>
