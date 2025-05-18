const url = 'https://openrouter.ai/api/v1/models';
const key = process.env.EVIDENCE_OPENROUTER_API_KEY;

// Initialize data as an empty array
let data = [];

// Check if API key exists
if (!key) {
  console.error('API key not found. Please set EVIDENCE_OPENROUTER_API_KEY environment variable');
  // Use sample data for testing with proper numeric types
  data = [
    {
      "id": "openai/codex-mini",
      "name": "OpenAI: Codex Mini",
      "context_length": 200000,
      "prompt_price": 0.000001,
      "completion_price": 0.000002,
      "image_price": 0,
      "request_price": 0,
      "free": false,
      "context_length_category": "Large (100K-200K)",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "tokenizer": "GPT",
      "is_moderated": true
    },
    {
      "id": "meta-llama/llama-3.3-8b-instruct:free",
      "name": "Meta: Llama 3.3 8B Instruct (free)",
      "context_length": 128000,
      "prompt_price": 0.0000005,
      "completion_price": 0.0000005,
      "image_price": 0,
      "request_price": 0,
      "free": true,
      "context_length_category": "Large (100K-200K)",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "tokenizer": "GPT",
      "is_moderated": true
    }
  ];
} else {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`,
  };

  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const json = await response.json();
    
    // Get the raw data from the API response
    const rawData = Array.isArray(json.data) ? json.data : 
                   (json.data ? [json.data] : 
                   Array.isArray(json) ? json : [json]);
    
    // Filter models to include only specific providers
    const filteredData = rawData.filter(model => {
      const id = model.id.toLowerCase();
      return id.includes('openai') || 
             id.includes('google') || 
             id.includes('anthropic')
            });
            //  id.includes('meta') || 
            //  id.includes('qwen') || 
            //  id.includes('deepseek');
    
    // Process each model to flatten and transform the data structure
    data = filteredData.map(model => {
      // Extract and parse pricing information
      const pricing = typeof model.pricing === 'object' ? model.pricing : 
                     (typeof model.pricing === 'string' ? 
                      JSON.parse(model.pricing.replace('[object Object]', '{}')) : 
                      { prompt: 0, completion: 0, image: 0, request: 0 });
      
      // Extract architecture information
      const architecture = typeof model.architecture === 'object' ? model.architecture : 
                          (typeof model.architecture === 'string' ? 
                           JSON.parse(model.architecture.replace('[object Object]', '{}')) : 
                           { input_modalities: [], output_modalities: [], tokenizer: "" });
      
      // Extract top provider information
      const topProvider = typeof model.top_provider === 'object' ? model.top_provider : 
                         (typeof model.top_provider === 'string' ? 
                          JSON.parse(model.top_provider.replace('[object Object]', '{}')) : 
                          { is_moderated: false });
      
      // Extract supported parameters
      const supportedParams = Array.isArray(model.supported_parameters) ? 
                             model.supported_parameters : 
                             (typeof model.supported_parameters === 'string' ? 
                              model.supported_parameters.split(',').map(param => param.trim()) : 
                              []);
      
      // Determine context length category
      let contextLengthCategory = "Unknown";
      const contextLength = Number(model.context_length) || 0;
      if (contextLength < 8000) contextLengthCategory = "Small (<8K)";
      else if (contextLength < 32000) contextLengthCategory = "Medium (8K-32K)";
      else if (contextLength < 100000) contextLengthCategory = "Large (32K-100K)";
      else if (contextLength < 200000) contextLengthCategory = "Large (100K-200K)";
      else contextLengthCategory = "Very Large (>200K)";
      
      // Return a flattened model object with all information in easily queryable format
      return {
        id: model.id,
        name: model.name,
        created: model.created,
        description: model.description,
        hugging_face_id: model.hugging_face_id || "",
        context_length: contextLength,
        context_length_category: contextLengthCategory,
        
        // Pricing information - converted to numbers for easier calculations
        prompt_price: parseFloat(pricing.prompt || 0),
        completion_price: parseFloat(pricing.completion || 0),
        image_price: parseFloat(pricing.image || 0),
        request_price: parseFloat(pricing.request || 0),
        
        // Architecture information
        input_modalities: architecture.input_modalities || [],
        output_modalities: architecture.output_modalities || [],
        tokenizer: architecture.tokenizer || "",
        
        // Provider information
        is_moderated: topProvider.is_moderated || false,
        
        // Feature flags based on model properties
        free: model.id.includes(':free'),
        is_multimodal: Array.isArray(architecture.input_modalities) && 
                      architecture.input_modalities.includes('image'),
        supports_functions: Array.isArray(supportedParams) && 
                           (supportedParams.includes('tools') || 
                            supportedParams.includes('tool_choice')),
        
        // Derived metrics for comparison
        cost_per_1k: parseFloat(pricing.prompt || 0) + parseFloat(pricing.completion || 0)
      };
    });
    
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    data = [];
  }
}

// Debug output to see what's being exported
console.log('OpenRouter models data:', data.slice(0, 2));
console.log('Data fields example:', data.length > 0 ? Object.keys(data[0]) : 'No data');

console.log('Total models fetched:', data.length);
// Make sure data is exported in the format Evidence expects
export { data };