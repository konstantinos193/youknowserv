"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ExternalLink, Globe, Send, AlertTriangle, Info, Shield, Activity, Waves } from "lucide-react"
import { Button } from "@/components/ui/button"
import { API_ENDPOINTS } from "@/lib/config/api"
import TopHolders from "../components/top-holders"
import { calculateRiskLevel } from "../utils/calculateRiskLevel"

// Types
interface Token {
  id: string
  name: string
  ticker: string
  price: number  // price in satoshis
  marketcap: number
  volume: number
  holder_count: number
  created_time: string
  creator: string
  creator_username?: string
  total_supply: string
  btc_liquidity: number
  token_liquidity: number
  creator_balance?: string
  description?: string
  website?: string
  twitter?: string
  telegram?: string
  rune?: string
  volumeMetrics?: VolumeMetrics
  creatorRisk: {
    tokenCount: number
    hasMultipleTokens: boolean
    otherTokens: Array<{
      id: string
      name: string
      ticker: string
    }>
  }
}

interface Holder {
  user: string
  user_username?: string
  balance: string
  pnl?: number
}

interface VolumeMetrics {
  volume24h: number
  volume24hUSD?: number
  averageDailyVolume: number
  averageDailyVolumeUSD?: number
  tradeCount24h: number
  buyVolume24h: number
  buyVolumeUSD?: number
  sellVolume24h: number
  sellVolumeUSD?: number
  buySellRatio: number
  spikeRatio: number
  volumeChange: string
}

interface HolderGrowthMetrics {
  dailyGrowth: {
    current: number
    previous: number
    growthRate: number
    newHolders: number
  }
  weeklyGrowth: {
    current: number
    previous: number
    growthRate: number
    newHolders: number
  }
  retentionRate: number
}

interface Trade {
  time: string;
  amount_btc: string;
  buy: boolean;
}

interface RiskAssessment {
  level: string;
  color: string;
  message: string;
  warning: string;
  stats?: {
    devPercentage: number;
    top5Percentage: number;
    top10Percentage: number;
  };
}

interface AsyncRiskAnalysisProps {
  holders: Holder[];
  totalSupply: string;
  creatorId: string;
  totalHolders: number;
  tokenId: string;
  onRiskUpdate?: (risk: RiskAssessment) => void;
  tokenData: Token;
}

// Helper functions
const formatUSDValue = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return "$0.00"

  // For values under $10,000, show exact amount
  if (Math.abs(value) < 10000) {
    return `$${value.toFixed(2)}`;
  }
  
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`
  } else {
    return `$${value.toFixed(2)}`
  }
}

const formatPnL = (value: number): string => {
  if (value < 1000) {
    return `$${value.toFixed(2)}`
  }
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`
  }
  return `$${(value / 1000).toFixed(2)}K`
}

const formatMarketCap = (price: number, totalSupply: string, btcPrice: number): string => {
  // Calculate market cap: Price × Supply
  const priceUsd = (price / 100000000) * btcPrice;  // Convert price from satoshis to USD
  const supply = Number(totalSupply) / 1e11;  // Convert supply to proper units
  const marketCapUsd = priceUsd * supply;

  // Force to show in millions by dividing by 1B
  return `$${(marketCapUsd / 1000000000).toFixed(2)}M`
}

const formatSupply = (format: "short" | "full" = "short", supply?: string): string => {
  if (!supply) return "0"

  const num = Number(supply) / 1e11

  if (format === "short") {
    if (num >= 1e9) {
      return `${(num / 1e9).toFixed(2)}B`
    } else if (num >= 1e6) {
      return `${(num / 1e6).toFixed(2)}M`
    } else if (num >= 1e3) {
      return `${(num / 1e3).toFixed(2)}K`
    } else {
      return num.toFixed(2)
    }
  }

  return num.toLocaleString()
}

// Helper function to format price
const formatTokenPrice = (price: number): string => {
  // Convert to proper decimal form (e.g., 456.81119 -> 0.45681119)
  const properDecimal = price / 1000;
  return `$${properDecimal.toFixed(5)}`;
};

// Add this function after the existing helper functions (around line 100, after formatSupply function)
const generateDiscordEmbed = (token: Token, volumeMetrics: VolumeMetrics | null, tokenData: Token) => {
  // This would typically be a server-side API endpoint that generates an image
  // For demonstration purposes, we're returning the metadata that would be used
  return {
    title: `${token.name} | ODINSCAN - Token Analysis`,
    description: token.description || `Analysis for ${token.name} token on Odin.fun`,
    image: `https://images.odin.fun/token/${token.id}`,
    color: 0x0ff4c6, // Cyan color in hex
    fields: [
      {
        name: "Floor Price",
        value: `${token.price.toFixed(4)} ${token.ticker}`,
        inline: true,
      },
      {
        name: "24h Volume",
        value: volumeMetrics ? `${volumeMetrics.volume24h.toLocaleString()} ${token.ticker}` : "N/A",
        inline: true,
      },
      {
        name: "Holders",
        value: token.holder_count.toString(),
        inline: true,
      },
      {
        name: "Market Cap",
        value: formatMarketCap(tokenData.price, tokenData.total_supply, 0),
        inline: true,
      },
    ],
    url: `https://odinscan.com/results?search=${token.id}`,
    // In a real implementation, you would generate an actual image URL here
    // This would be a server-side API endpoint that renders the token card as an image
    embedImageUrl: `https://api.odinscan.com/embed/token/${token.id}.png`,
  }
}

// Add this function to handle sharing
const shareToDiscord = (token: Token, volumeMetrics: VolumeMetrics | null, tokenData: Token) => {
  const embed = generateDiscordEmbed(token, volumeMetrics, tokenData)

  // In a real implementation, you would:
  // 1. Generate the embed image on the server
  // 2. Return a URL that can be copied to clipboard

  // For demo purposes, we'll just show what would be copied
  const shareUrl = `https://odinscan.com/results?search=${token.id}`

  // In a real app, you would copy this to clipboard
  alert(`Share link copied: ${shareUrl}\n\nThis link will show a rich embed when shared on Discord.`)
}

// Add this function after the existing helper functions
const createShareableCard = (token: Token, volumeMetrics: VolumeMetrics | null, btcPrice: number) => {
  return {
    title: `${token.name} | ODINSCAN - Token Analysis`,
    description: token.description || `Analysis for ${token.name} token on Odin.fun`,
    image: `https://images.odin.fun/token/${token.id}`,
    stats: {
      floorPrice: formatTokenPrice((Number(token.price) / 100000000) * btcPrice),
      volume24h: volumeMetrics ? `${volumeMetrics.volume24h.toLocaleString()} ${token.ticker}` : "N/A",
      holders: token.holder_count.toString(),
      marketCap: formatMarketCap(token.price, token.total_supply, btcPrice)
    },
    url: `https://odinscan.com/results?search=${token.id}`,
  }
}

// Mock data for demonstration
const MOCK_TOKEN: Token = {
  id: "2ait",
  name: "AIEYE",
  ticker: "AIEYE",
  price: 0.0001,
  marketcap: 10000,
  volume: 5000,
  holder_count: 0, // Set to 0 to show "RUGGED" state
  created_time: "2023-01-01T00:00:00Z",
  creator: "creator1",
  total_supply: "100000000000",
  btc_liquidity: 0.5,
  token_liquidity: 50000,
  description: "AI-powered token for the Odin ecosystem with advanced analytics and trading capabilities.",
  website: "https://example.com",
  twitter: "https://twitter.com/example",
  telegram: "https://t.me/example",
  rune: "ODINDOG•ID•YTTL•ODIN",
  creatorRisk: {
    tokenCount: 0,
    hasMultipleTokens: false,
    otherTokens: []
  },
}

const MOCK_HOLDERS: Holder[] = [
  {
    user: "creator1",
    user_username: "Creator",
    balance: "50000000000",
    pnl: 5000,
  },
  {
    user: "user1",
    user_username: "Whale1",
    balance: "20000000000",
    pnl: 2000,
  },
  {
    user: "user2",
    user_username: "Whale2",
    balance: "10000000000",
    pnl: -1000,
  },
  {
    user: "user3",
    user_username: "Whale3",
    balance: "5000000000",
    pnl: 500,
  },
  {
    user: "user4",
    user_username: "Whale4",
    balance: "2500000000",
    pnl: -200,
  },
]

const MOCK_VOLUME_METRICS: VolumeMetrics = {
  volume24h: 5000,
  volume24hUSD: 500,
  averageDailyVolume: 3000,
  averageDailyVolumeUSD: 300,
  tradeCount24h: 42,
  buyVolume24h: 3000,
  buyVolumeUSD: 300,
  sellVolume24h: 2000,
  sellVolumeUSD: 200,
  buySellRatio: 1.5,
  spikeRatio: 1.67,
  volumeChange: "67.00",
}

const MOCK_HOLDER_GROWTH: HolderGrowthMetrics = {
  dailyGrowth: {
    current: 0,
    previous: 1,
    growthRate: -100,
    newHolders: -1,
  },
  weeklyGrowth: {
    current: 0,
    previous: 5,
    growthRate: -100,
    newHolders: -5,
  },
  retentionRate: 0,
}

// Add this helper function before the AsyncRiskAnalysis component
const fetchCreatorTokens = async (creatorId: string): Promise<any[]> => {
  try {
    const response = await fetch(`${API_ENDPOINTS.token(creatorId)}/created`);
    if (!response.ok) {
      throw new Error('Failed to fetch creator tokens');
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching creator tokens:', error);
    return [];
  }
};

// Add this function after the fetchCreatorTokens function
const fetchCreatorUsername = async (creatorId: string): Promise<string> => {
  try {
    const response = await fetch(`https://api.odin.fun/v1/user/${creatorId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch creator info');
    }
    const data = await response.json();
    return data.username || "Unknown";
  } catch (error) {
    console.error('Error fetching creator info:', error);
    return "Unknown";
  }
};

// Components
const TokenImage = ({ tokenId, name }: { tokenId: string; name: string }) => {
  return (
    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-800">
      <Image
        src={`https://images.odin.fun/token/${tokenId}`}
        alt={name}
        fill
        className="object-cover"
        unoptimized
      />
    </div>
  )
}

const SocialLinks = ({ twitter, website, telegram }: { twitter?: string; website?: string; telegram?: string }) => {
  if (!twitter && !website && !telegram) return null

  return (
    <div className="flex items-center gap-3 mt-2">
      {website && (
        <Link
          href={website}
          target="_blank"
          className="text-blue-400/70 hover:text-blue-400 transition-colors"
          title="Website"
        >
          <Globe className="h-4 w-4" />
        </Link>
      )}
      {twitter && (
        <Link
          href={twitter}
          target="_blank"
          className="text-blue-400/70 hover:text-blue-400 transition-colors group"
          title="X (formerly Twitter)"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 1200 1227"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="transition-colors text-blue-400/70 group-hover:text-blue-400"
          >
            <path
              d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z"
              fill="currentColor"
            />
          </svg>
        </Link>
      )}
      {telegram && (
        <Link
          href={telegram}
          target="_blank"
          className="text-blue-400/70 hover:text-blue-400 transition-colors"
          title="Telegram"
        >
          <Send className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}

interface RiskAnalysisProps {
  tokenData: Token;
  holders: Holder[];
}

const RiskAnalysis = ({ tokenData, holders }: RiskAnalysisProps) => {
  // Check for rugged status first
  const isRugged = tokenData.holder_count === 0;
  // Check for multiple tokens by creator
  const hasMultipleTokens = tokenData.creatorRisk.tokenCount > 1;

  if (isRugged) {
    return (
      <div className="bg-gray-900/50 border border-cyan-600/20 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-yellow-300 mb-4">Risk Analysis</h2>
        <div className="bg-gray-900/80 p-4 rounded-lg border border-red-600/20">
          <div className="text-xl font-bold text-red-500 mb-2">RUGGED</div>
          <div className="text-sm text-red-500 mb-2">DANGER: Token has 0 holders</div>
          <p className="text-sm text-cyan-400/80">Token has been rugged - All holders have sold</p>
        </div>
      </div>
    );
  }

  if (hasMultipleTokens) {
    return (
      <div className="bg-gray-900/50 border border-cyan-600/20 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-yellow-300 mb-4">Risk Analysis</h2>
        <div className="bg-gray-900/80 p-4 rounded-lg border border-red-600/20">
          <div className="text-xl font-bold text-red-500 mb-2">EXTREME RISK</div>
          <div className="text-sm text-red-500 mb-2">
            Developer has created {tokenData.creatorRisk.tokenCount} tokens
          </div>
          <p className="text-sm text-cyan-400/80">Multiple tokens by same developer - High risk of abandonment</p>
        </div>
      </div>
    );
  }

  // Regular risk analysis for other cases
  return (
    <div className="bg-gray-900/50 border border-cyan-600/20 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-yellow-300 mb-4">Risk Analysis</h2>
      <AsyncRiskAnalysis 
        holders={holders}
        totalSupply={tokenData.total_supply}
        creatorId={tokenData.creator}
        totalHolders={tokenData.holder_count}
        tokenId={tokenData.id}
        onRiskUpdate={(risk) => {
          // Handle risk update
        }}
        tokenData={tokenData}
      />
    </div>
  );
};

const AsyncRiskAnalysis = ({ 
  holders, 
  totalSupply, 
  creatorId, 
  totalHolders, 
  tokenId, 
  onRiskUpdate,
  tokenData
}: AsyncRiskAnalysisProps) => {
  const [risk, setRisk] = useState<RiskAssessment | null>(null);

  useEffect(() => {
    const updateRiskAnalysis = async () => {
      try {
        // Use the shared risk assessment function
        const riskAssessment = calculateRiskLevel(
          tokenData,
          holders,
          totalHolders
        );

        setRisk(riskAssessment);
        if (onRiskUpdate) onRiskUpdate(riskAssessment);

      } catch (err) {
        console.error('Error in risk analysis:', err);
        setRisk({
          level: "ERROR",
          color: "text-red-600",
          message: "Error calculating risk level",
          warning: "Error in risk analysis"
        });
      }
    };

    updateRiskAnalysis();
  }, [holders, totalSupply, creatorId, tokenId, onRiskUpdate, totalHolders, tokenData]);

  if (!risk) {
    return <div className="text-cyan-400 bg-gray-900/50 p-4 rounded-lg border border-cyan-600/20">LOADING</div>;
  }

  return (
    <div className="bg-gray-900/50 p-4 rounded-lg border border-cyan-600/20">
      <div className={`text-xl font-bold mb-2 ${risk.color}`}>
        {risk.level}
      </div>
      <div className={`text-sm font-medium mb-2 ${risk.color}`}>
        {risk.warning}
      </div>
      <p className="text-sm text-cyan-400/80 mb-4">
        {risk.message}
      </p>

      {risk.stats && (
        <div className="mt-4 text-sm text-cyan-400/80 space-y-1">
          <p>• Developer holds {risk.stats.devPercentage.toFixed(2)}% of supply</p>
          <p>• Top 5 holders control {risk.stats.top5Percentage.toFixed(2)}% of supply</p>
          <p>• Top 10 holders control {risk.stats.top10Percentage.toFixed(2)}% of supply</p>
        </div>
      )}
    </div>
  );
};

export default function ResultsPage() {
  const searchParams = useSearchParams()
  const search = searchParams.get('search') || ''

  const [tokenData, setTokenData] = useState<Token | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [holders, setHolders] = useState<Holder[]>([])
  const [creatorUsername, setCreatorUsername] = useState<string>("")
  const [price, setPrice] = useState<{
    btcPrice: number
    tokenPrice: number
    usdPrice: string
  } | null>(null)
  const [btcUsdPrice, setBtcUsdPrice] = useState(0)
  const [holderAnalysis, setHolderAnalysis] = useState<HolderGrowthMetrics | null>(null)
  const [volumeMetrics, setVolumeMetrics] = useState<VolumeMetrics | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [isLoadingTrades, setIsLoadingTrades] = useState(false)
  const [tradesError, setTradesError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!search) {
          setError("No token ID provided");
          setLoading(false);
          return;
        }

        setLoading(true);
        console.log('🔍 Starting data fetch for token:', search);

        const headers = {
          'Accept': 'application/json',
          'Origin': 'https://odinscan.fun',
          'Referer': 'https://odinscan.fun/'
        };
        
        // Use the direct API endpoints with proper headers
        const responses = await Promise.all([
          fetch(`${API_ENDPOINTS.token(search)}`, { headers }),
          fetch(`${API_ENDPOINTS.tokenOwners(search)}`, { headers }),
          fetch(API_ENDPOINTS.btcPrice, { headers }),
          fetch(`${API_ENDPOINTS.tokenMetrics(search)}`, { headers })
        ]);

        const [tokenResponse, holdersResponse, btcPriceResponse, holderGrowthResponse] = responses;

        if (!tokenResponse.ok) {
          throw new Error(`Failed to fetch token data: ${tokenResponse.status}`);
        }

        const results = await Promise.all([
          tokenResponse.json(),
          holdersResponse.ok ? holdersResponse.json() : { data: [] },
          btcPriceResponse.ok ? btcPriceResponse.json() : { USD: 0 },
          holderGrowthResponse.ok ? holderGrowthResponse.json() : null
        ]);

        const [tokenData, holdersData, btcPriceData, holderGrowthData] = results;

        // Fetch creator username with same headers
        const creatorResponse = await fetch(`https://api.odin.fun/v1/user/${tokenData.creator}`, { headers });
        const creatorData = await creatorResponse.json();
        setCreatorUsername(creatorData.username || "Unknown");

        // Set holders with PnL data
        setHolders(holdersData.data || []);

        // Set token data and calculate price
        setTokenData(tokenData);
        const btcPrice = Number(btcPriceData.USD);
        setBtcUsdPrice(btcPrice);

        // Calculate USD price
        const priceInBtc = Number(tokenData.price) / 100000000;
        const priceInUsd = priceInBtc * btcPrice;
        setPrice({
          btcPrice: priceInBtc,
          tokenPrice: tokenData.price,
          usdPrice: priceInUsd.toLocaleString('en-US', {
            minimumFractionDigits: 5,
            maximumFractionDigits: 5
          })
        });

        if (tokenData.volumeMetrics) {
          setVolumeMetrics(tokenData.volumeMetrics);
        }

        // Handle holder growth metrics with proper error checking
        if (holderGrowthData && !holderGrowthData.error) {
          console.log('✅ Setting holder growth metrics:', holderGrowthData);
          setHolderAnalysis(holderGrowthData);
        } else {
          console.warn('⚠️ No holder growth data available:', holderGrowthData?.error || 'Unknown error');
          // Set default holder growth metrics
          setHolderAnalysis({
            dailyGrowth: {
              current: tokenData.holder_count || 0,
              previous: tokenData.holder_count || 0,
              growthRate: 0,
              newHolders: 0
            },
            weeklyGrowth: {
              current: tokenData.holder_count || 0,
              previous: tokenData.holder_count || 0,
              growthRate: 0,
              newHolders: 0
            },
            retentionRate: 100
          });
        }

        setLoading(false);

      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : "Failed to fetch token data");
        setLoading(false);
      }
    };

    fetchData();
  }, [search]);

  const fetchTrades = async () => {
    try {
      setIsLoadingTrades(true);
      setTradesError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const headers = {
        'Accept': 'application/json',
        'Origin': 'https://odinscan.fun',
        'Referer': 'https://odinscan.fun/'
      };
      
      const response = await fetch(`${API_ENDPOINTS.tokenTrades(search)}`, {
        signal: controller.signal,
        headers
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch trades: ${response.status}`);
      }
      
      const data = await response.json();
      setTrades(data.data.slice(-100));
    } catch (error) {
      if (error instanceof Error) {
        setTradesError(error.message);
      } else {
        setTradesError('Failed to fetch trades');
      }
    } finally {
      setIsLoadingTrades(false);
    }
  };

  useEffect(() => {
    if (search) {
      fetchTrades();
    }
  }, [search]);

  // Add this to the component, after the useEffect hooks
  const handleShare = () => {
    if (tokenData && volumeMetrics) {
      shareToDiscord(tokenData, volumeMetrics, tokenData)
    }
  }

  // Add this to the component, after the useEffect hooks
  const shareableCard = tokenData ? createShareableCard(tokenData, volumeMetrics, btcUsdPrice) : null

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <header className="border-b border-blue-600/20 w-full">
          <div className="container flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-800 rounded-lg animate-pulse"></div>
              <div className="h-5 w-32 bg-gray-800 rounded animate-pulse"></div>
            </div>
            <div className="h-8 w-24 bg-gray-800 rounded animate-pulse"></div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          <div className="h-6 w-32 bg-gray-800 rounded animate-pulse mb-6"></div>

          <div className="bg-gray-900/50 border border-blue-600/20 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-[60px] h-[60px] bg-gray-800 rounded-lg animate-pulse"></div>
              <div className="flex-1">
                <div className="h-6 w-48 bg-gray-800 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-full bg-gray-800 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-3/4 bg-gray-800 rounded animate-pulse"></div>
              </div>
              <div className="h-10 w-24 bg-gray-800 rounded animate-pulse"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-800 rounded animate-pulse"></div>
              ))}
            </div>
          </div>

          <div className="h-10 w-full bg-gray-800 rounded animate-pulse mb-6"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-800 rounded animate-pulse"></div>
            <div className="h-64 bg-gray-800 rounded animate-pulse"></div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-gray-900 border border-blue-600/20 rounded-lg p-6 max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white text-center mb-4">Error</h2>
          <p className="text-blue-400 text-center mb-6">{error}</p>
          <Button asChild className="w-full bg-blue-500 hover:bg-blue-600 text-black">
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!tokenData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-gray-900 border border-blue-600/20 rounded-lg p-6 max-w-md">
          <Info className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white text-center mb-4">No Data Found</h2>
          <p className="text-blue-400 text-center mb-6">No token data available for the requested ID.</p>
          <Button asChild className="w-full bg-blue-500 hover:bg-blue-600 text-black">
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="w-full py-3 sm:py-4 bg-black border-b border-cyan-600/20">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <div className="mr-2 sm:mr-3">
                <Image
                  src="https://i.postimg.cc/pTvbWnHN/image-removebg-preview.png"
                  alt="ODINSCAN Logo"
                  width={48}
                  height={48}
                  className="w-10 h-10 sm:w-12 sm:h-12"
                />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-yellow-300">ODINSCAN</h1>
                <div className="text-[10px] sm:text-xs text-cyan-400">Token Explorer</div>
              </div>
            </div>

            {/* Navigation Icons */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link
                href="/"
                className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gray-900 border border-cyan-600/30"
                title="Home"
              >
                <Shield className="h-4 w-4 text-cyan-400" />
              </Link>
              <Link
                href="/tokens"
                className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gray-900 border border-cyan-600/30"
                title="Tokens"
              >
                <Activity className="h-4 w-4 text-cyan-400" />
              </Link>
              <div
                className="relative flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gray-900 border border-cyan-600/10 cursor-not-allowed"
                title="Whale Activity (Coming Soon)"
              >
                <Waves className="h-4 w-4 text-cyan-400/40" />
                <div className="absolute -top-1 -right-1 bg-yellow-300 text-black px-1 py-0.5 rounded-full text-[8px] font-bold">
                  SOON
                </div>
              </div>
              <Link
                href={process.env.NEXT_PUBLIC_BUY_URL || "https://odin.fun"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center h-8 sm:h-9 px-2 sm:px-3 rounded-full bg-cyan-500 text-black font-medium text-xs"
              >
                BUY
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Back button and Trade button */}
        <div className="flex justify-between items-center mb-6">
          <Button asChild variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300">
            <Link href="/tokens">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tokens
            </Link>
          </Button>
        </div>

        {/* Token header */}
        <div className="bg-gray-900/50 border border-cyan-600/20 rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-start gap-4">
              <TokenImage tokenId={search} name={tokenData.name} />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-yellow-300">{tokenData.name}</h1>
                  <span className="text-cyan-400 text-sm">{tokenData.ticker}</span>
                </div>
                <p className="text-cyan-400/80 text-sm mt-1 max-w-xl">
                  {tokenData.description || "No description available"}
                </p>
                {tokenData.rune && (
                  <Link
                    href={`https://unisat.io/runes/detail/${tokenData.rune}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-500 hover:text-cyan-400 text-sm mt-1 block"
                  >
                    {tokenData.rune}
                  </Link>
                )}
                <SocialLinks twitter={tokenData.twitter} website={tokenData.website} telegram={tokenData.telegram} />
              </div>
            </div>

            <div className="flex flex-col items-end">
              <div className="text-2xl font-bold text-yellow-300">
                {formatTokenPrice((Number(tokenData.price) / 100000000) * btcUsdPrice)}
              </div>
              <div className="text-sm text-cyan-400">Market Cap: {formatMarketCap(tokenData.price, tokenData.total_supply, btcUsdPrice)}</div>
              <Button asChild className="bg-cyan-500 hover:bg-cyan-600 text-black font-medium mt-2">
                <Link href={`https://odin.fun/token/${search}`} target="_blank" rel="noopener noreferrer">
                  Trade on Odin.fun
                </Link>
              </Button>
            </div>
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900/80 border border-cyan-600/20 p-4 rounded-lg">
              <div className="text-sm text-cyan-400/80 mb-1">Price</div>
              <div className="text-lg font-bold text-yellow-300">
                {formatTokenPrice((Number(tokenData.price) / 100000000) * btcUsdPrice)}
              </div>
            </div>

            <div className="bg-gray-900/80 border border-cyan-600/20 p-4 rounded-lg">
              <div className="text-sm text-cyan-400/80 mb-1">Holders</div>
              <div className="text-lg font-bold text-yellow-300">{tokenData.holder_count}</div>
              <div className="text-xs text-red-500">-100%</div>
            </div>

            <div className="bg-gray-900/80 border border-cyan-600/20 p-4 rounded-lg">
              <div className="text-sm text-cyan-400/80 mb-1">Volume (24h)</div>
              <div className="text-lg font-bold text-yellow-300">
                {formatUSDValue(volumeMetrics?.volume24hUSD || 0)}
              </div>
              <div className={`text-xs ${Number(volumeMetrics?.volumeChange || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {volumeMetrics?.volumeChange ? `${Number(volumeMetrics.volumeChange) >= 0 ? '+' : ''}${volumeMetrics.volumeChange}%` : '0.00%'}
              </div>
            </div>

            <div className="bg-gray-900/80 border border-cyan-600/20 p-4 rounded-lg">
              <div className="text-sm text-cyan-400/80 mb-1">Created</div>
              <div className="text-lg font-bold text-yellow-300">
                {new Date(tokenData.created_time).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* All content sections in a grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Analysis */}
          <RiskAnalysis tokenData={tokenData} holders={holders} />

          {/* Token Overview */}
          <div className="bg-gray-900/50 border border-cyan-600/20 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-300 mb-4">Token Overview</h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-cyan-600/10">
                <span className="text-cyan-400/80">Name</span>
                <span className="text-yellow-300">{tokenData.name}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-cyan-600/10">
                <span className="text-cyan-400/80">Ticker</span>
                <span className="text-yellow-300">{tokenData.ticker}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-cyan-600/10">
                <span className="text-cyan-400/80">Creator</span>
                <Link
                  href={`https://odin.fun/user/${tokenData.creator}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-500 hover:text-cyan-400"
                >
                  {creatorUsername}
                </Link>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-cyan-600/10">
                <span className="text-cyan-400/80">Total Supply</span>
                <span className="text-yellow-300">
                  {formatSupply("short", tokenData.total_supply)} {tokenData.ticker}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-cyan-600/10">
                <span className="text-cyan-400/80">Market Cap</span>
                <span className="text-yellow-300">{formatMarketCap(tokenData.price, tokenData.total_supply, btcUsdPrice)}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-cyan-600/10">
                <span className="text-cyan-400/80">Created</span>
                <span className="text-yellow-300">{new Date(tokenData.created_time).toLocaleDateString()}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-cyan-400/80">Liquidity</span>
                <span className="text-yellow-300">
                  {Number(tokenData.token_liquidity) > 0 ? "Available" : "Not Available"}
                </span>
              </div>
            </div>
          </div>

          {/* Top Holders */}
          <TopHolders 
            holders={holders}
            tokenData={tokenData}
            loading={loading}
          />

          {/* Holder Growth */}
          <div className="bg-gray-900/50 border border-cyan-600/20 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-300 mb-4">Holder Growth</h2>

            {holderAnalysis ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-900/80 border border-cyan-600/20 p-4 rounded-lg">
                    <div className="text-sm text-cyan-400/80 mb-1">Current Holders</div>
                    <div className="text-xl font-bold text-yellow-300">{holderAnalysis.dailyGrowth.current}</div>
                    <div className="text-xs text-red-500 flex items-center mt-1">
                      <span>↓ {holderAnalysis.dailyGrowth.growthRate.toFixed(2)}% in 24h</span>
                    </div>
                  </div>

                  <div className="bg-gray-900/80 border border-cyan-600/20 p-4 rounded-lg">
                    <div className="text-sm text-cyan-400/80 mb-1">Previous Holders</div>
                    <div className="text-xl font-bold text-yellow-300">{holderAnalysis.dailyGrowth.previous}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-cyan-400/80">Daily Change</span>
                    <span className="text-red-500">{holderAnalysis.dailyGrowth.newHolders}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-cyan-400/80">Weekly Change</span>
                    <span className="text-red-500">{holderAnalysis.weeklyGrowth.newHolders}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-cyan-400/80">Retention Rate</span>
                    <span className="text-yellow-300">{holderAnalysis.retentionRate}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-pulse space-y-3">
                <div className="h-16 bg-gray-800 rounded mb-4"></div>
                <div className="h-4 bg-gray-800 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-800 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-800 rounded w-3/4"></div>
              </div>
            )}
          </div>

          {/* Volume Analysis */}
          <div className="bg-gray-900/50 border border-cyan-600/20 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-300 mb-4">Volume Analysis</h2>

            {volumeMetrics ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-900/80 border border-cyan-600/20 p-4 rounded-lg">
                    <div className="text-sm text-cyan-400/80 mb-1">24h Volume</div>
                    <div className="text-xl font-bold text-yellow-300">
                      {formatUSDValue(volumeMetrics.volume24hUSD || 0)}
                    </div>
                    <div className="text-xs text-green-500 flex items-center mt-1">
                      <span>↑ {volumeMetrics.volumeChange}% from average</span>
                    </div>
                  </div>

                  <div className="bg-gray-900/80 border border-cyan-600/20 p-4 rounded-lg">
                    <div className="text-sm text-cyan-400/80 mb-1">Buy/Sell Ratio</div>
                    <div className="text-xl font-bold text-yellow-300">{volumeMetrics.buySellRatio.toFixed(2)}</div>
                    <div className="text-xs text-cyan-400/80 flex items-center mt-1">
                      <span>More buys than sells</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-cyan-400/80">Average Daily Volume</span>
                    <span className="text-yellow-300">{formatUSDValue(volumeMetrics.averageDailyVolumeUSD || 0)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-cyan-400/80">24h Trades</span>
                    <span className="text-yellow-300">{volumeMetrics.tradeCount24h}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-cyan-400/80">Buy Volume</span>
                    <span className="text-yellow-300">{formatUSDValue(volumeMetrics.buyVolumeUSD || 0)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-cyan-400/80">Sell Volume</span>
                    <span className="text-yellow-300">{formatUSDValue(volumeMetrics.sellVolumeUSD || 0)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-cyan-400/80">Volume Spike Ratio</span>
                    <span className="text-yellow-300">{volumeMetrics.spikeRatio.toFixed(2)}x</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-pulse space-y-3">
                <div className="h-16 bg-gray-800 rounded mb-4"></div>
                <div className="h-4 bg-gray-800 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-800 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-800 rounded w-3/4"></div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
