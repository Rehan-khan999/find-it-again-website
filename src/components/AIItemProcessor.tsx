import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, AlertTriangle, Lightbulb, CheckCircle2 } from "lucide-react";
import { processNewItem } from "@/services/aiAssistant";
import { toast } from "sonner";

interface AIItemProcessorProps {
  item: {
    title?: string;
    description?: string;
    category: string;
    location: string;
    photos?: string[];
    item_type: string;
    date_lost_found?: string;
  };
  onTagsGenerated?: (tags: string[]) => void;
  onTitleSuggested?: (title: string) => void;
  onDescriptionSuggested?: (description: string) => void;
  onDuplicatesFound?: (duplicates: any[]) => void;
  onMatchesFound?: (matches: any[]) => void;
}

export const AIItemProcessor = ({
  item,
  onTagsGenerated,
  onTitleSuggested,
  onDescriptionSuggested,
  onDuplicatesFound,
  onMatchesFound,
}: AIItemProcessorProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [objects, setObjects] = useState<string[]>([]);
  const [missingInfo, setMissingInfo] = useState<string[]>([]);
  const [suggestedTitle, setSuggestedTitle] = useState("");
  const [suggestedDescription, setSuggestedDescription] = useState("");
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [hasProcessed, setHasProcessed] = useState(false);

  const handleProcess = async () => {
    setIsProcessing(true);

    try {
      const { data, error } = await processNewItem(item);

      if (error) {
        toast.error("AI processing failed: " + error);
        return;
      }

      if (data) {
        if (data.tags) {
          setTags(data.tags);
          onTagsGenerated?.(data.tags);
        }
        if (data.objects) {
          setObjects(data.objects);
        }
        if (data.autoTitle) {
          setSuggestedTitle(data.autoTitle);
        }
        if (data.autoDescription) {
          setSuggestedDescription(data.autoDescription);
        }
        if (data.duplicates && data.duplicates.length > 0) {
          setDuplicates(data.duplicates);
          onDuplicatesFound?.(data.duplicates);
        }
        if (data.matches && data.matches.length > 0) {
          setMatches(data.matches);
          onMatchesFound?.(data.matches);
        }
        if (data.missingInfo) {
          setMissingInfo(data.missingInfo);
        }
        setHasProcessed(true);
        toast.success("AI analysis complete!");
      }
    } catch (error) {
      console.error("AI processing error:", error);
      toast.error("Failed to process with AI");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action button */}
        <Button
          onClick={handleProcess}
          disabled={isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Auto-Analyze
            </>
          )}
        </Button>

        {/* Detected objects */}
        {objects.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Detected Objects:</p>
            <div className="flex flex-wrap gap-1">
              {objects.map((obj, i) => (
                <Badge key={i} variant="secondary">
                  {obj}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Generated tags */}
        {tags.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">AI-Generated Tags:</p>
            <div className="flex flex-wrap gap-1">
              {tags.map((tag, i) => (
                <Badge key={i} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Suggested title */}
        {suggestedTitle && !item.title && (
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">Suggested title:</span> {suggestedTitle}
              <Button
                variant="link"
                size="sm"
                className="ml-2 h-auto p-0"
                onClick={() => onTitleSuggested?.(suggestedTitle)}
              >
                Use this
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Suggested description */}
        {suggestedDescription && !item.description && (
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">Suggested description:</span>{" "}
              {suggestedDescription}
              <Button
                variant="link"
                size="sm"
                className="ml-2 h-auto p-0"
                onClick={() => onDescriptionSuggested?.(suggestedDescription)}
              >
                Use this
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Duplicate warning */}
        {duplicates.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">Possible duplicates found!</span>
              <ul className="mt-1 text-sm">
                {duplicates.map((dup, i) => (
                  <li key={i}>• {dup.title}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Potential matches */}
        {matches.length > 0 && (
          <Alert className="border-green-500">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription>
              <span className="font-medium text-green-600">
                {matches.length} potential match{matches.length > 1 ? "es" : ""} found!
              </span>
              <ul className="mt-1 text-sm">
                {matches.slice(0, 3).map((match, i) => (
                  <li key={i}>
                    • {match.item?.title} ({match.score}% match)
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Missing info suggestions */}
        {missingInfo.length > 0 && (
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">Consider adding:</span>
              <ul className="mt-1 text-sm">
                {missingInfo.map((info, i) => (
                  <li key={i}>• {info}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Success state */}
        {hasProcessed && duplicates.length === 0 && missingInfo.length === 0 && (
          <Alert className="border-green-500">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-600">
              Your posting looks great! Ready to submit.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default AIItemProcessor;
