import { Button } from "@/components/ui/button"
import { FigmaService } from "@/lib/figma-service"
import type { FigmaDesignSelection, FigmaNode } from "@/types/figma"
import {
  ChevronLeft,
  Download,
  ExternalLink,
  Loader2,
  ZoomIn
} from "lucide-react"
import { memo, useCallback, useEffect, useRef, useState } from "react"

interface FigmaDesignSelectorProps {
  fileId: string
  frameUrl: string
  onBack: () => void
  onSelectionComplete: (selection: FigmaDesignSelection) => void
}

interface SelectableNode extends FigmaNode {
  imageUrl?: string
  isSelectable: boolean
}

/**
 * Advanced component for selecting items within a Figma design
 */
const FigmaDesignSelector = memo(
  ({
    fileId,
    frameUrl,
    onBack,
    onSelectionComplete
  }: FigmaDesignSelectorProps): JSX.Element => {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [nodes, setNodes] = useState<SelectableNode[]>([])
    const [selectedNode, setSelectedNode] = useState<SelectableNode | null>(
      null
    )
    const [hoveredNode, setHoveredNode] = useState<SelectableNode | null>(null)
    const [designImageUrl, setDesignImageUrl] = useState<string | null>(null)

    const containerRef = useRef<HTMLDivElement>(null)
    const figmaService = FigmaService.getInstance()

    // Load Figma file data
    useEffect(() => {
      loadFigmaFile()
    }, [fileId])

    const loadFigmaFile = async (): Promise<void> => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await figmaService.getFigmaFile(fileId)

        if (response.success && response.data) {
          // Extract selectable nodes from the file
          const selectableNodes = extractSelectableNodes(
            response.data.nodes.root ||
              response.data.nodes[Object.keys(response.data.nodes)[0]!]
          )
          setNodes(selectableNodes)
        } else {
          setError(response.error || "Failed to load Figma file")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setIsLoading(false)
      }
    }

    const extractSelectableNodes = (node: FigmaNode): SelectableNode[] => {
      const selectableNodes: SelectableNode[] = []

      const traverse = (currentNode: FigmaNode): void => {
        // Check if node is selectable (has bounding box and is visible)
        const isSelectable = Boolean(
          currentNode.visible &&
            currentNode.absoluteBoundingBox &&
            [
              "FRAME",
              "RECTANGLE",
              "ELLIPSE",
              "TEXT",
              "GROUP",
              "COMPONENT",
              "INSTANCE"
            ].includes(currentNode.type)
        )

        if (isSelectable) {
          selectableNodes.push({
            ...currentNode,
            isSelectable: true
          })
        }

        // Recursively process children
        if (currentNode.children) {
          currentNode.children.forEach(traverse)
        }
      }

      traverse(node)
      return selectableNodes
    }

    const handleNodeHover = useCallback((node: SelectableNode | null): void => {
      setHoveredNode(node)
    }, [])

    const handleNodeClick = useCallback((node: SelectableNode): void => {
      setSelectedNode(node)
    }, [])

    const handleConfirmSelection = async (): Promise<void> => {
      if (!selectedNode) return

      setIsLoading(true)
      try {
        // Get image for the selected node
        const imageResponse = await figmaService.getFigmaNodeImage(
          fileId,
          selectedNode.id,
          {
            format: "png",
            scale: 2
          }
        )

        if (imageResponse.success && imageResponse.data) {
          const selection: FigmaDesignSelection = {
            node: selectedNode,
            imageUrl: imageResponse.data.imageUrl,
            boundingBox: selectedNode.absoluteBoundingBox!
          }

          onSelectionComplete(selection)
        } else {
          setError(imageResponse.error || "Failed to get node image")
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to process selection"
        )
      } finally {
        setIsLoading(false)
      }
    }

    const openInFigma = (): void => {
      window.open(frameUrl, "_blank")
    }

    if (error) {
      return (
        <div className="flex h-full flex-col items-center justify-center p-6">
          <div className="mb-4 text-center">
            <div className="mb-2 text-lg font-medium text-red-700">
              Error Loading Design
            </div>
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack}>
              Go Back
            </Button>
            <Button onClick={loadFigmaFile}>Try Again</Button>
          </div>
        </div>
      )
    }

    return (
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <div>
              <h3 className="font-medium text-gray-900">
                Select Design Element
              </h3>
              <p className="text-sm text-gray-500">
                Choose an element to compare with your implementation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openInFigma}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in Figma
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-600">Loading Figma design...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Design Preview */}
              <div
                ref={containerRef}
                className="relative flex-1 overflow-auto bg-gray-50 p-4">
                {/* Design Image */}
                <div className="relative mx-auto max-w-fit rounded-lg bg-white shadow-lg">
                  {designImageUrl ? (
                    <img
                      src={designImageUrl}
                      alt="Figma Design"
                      className="max-h-[600px] max-w-full rounded-lg"
                    />
                  ) : (
                    <div className="flex h-64 w-96 items-center justify-center rounded-lg bg-gray-200">
                      <p className="text-gray-500">
                        Design preview will appear here
                      </p>
                    </div>
                  )}

                  {/* Selection Overlays */}
                  {nodes.map((node) => {
                    if (!node.absoluteBoundingBox) return null

                    const isHovered = hoveredNode?.id === node.id
                    const isSelected = selectedNode?.id === node.id

                    return (
                      <div
                        key={node.id}
                        className={`absolute cursor-pointer rounded transition-all ${
                          isSelected
                            ? "border-2 border-blue-500 bg-blue-100 bg-opacity-20"
                            : isHovered
                              ? "border-2 border-blue-300 bg-blue-50 bg-opacity-20"
                              : "border border-transparent hover:border-blue-200"
                        }`}
                        style={{
                          left: `${node.absoluteBoundingBox.x}px`,
                          top: `${node.absoluteBoundingBox.y}px`,
                          width: `${node.absoluteBoundingBox.width}px`,
                          height: `${node.absoluteBoundingBox.height}px`
                        }}
                        onMouseEnter={() => handleNodeHover(node)}
                        onMouseLeave={() => handleNodeHover(null)}
                        onClick={() => handleNodeClick(node)}
                        title={node.name}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Sidebar */}
              <div className="w-80 border-l border-gray-200 bg-white p-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Selection Info
                    </h4>
                    {selectedNode ? (
                      <div className="mt-2 space-y-2 text-sm">
                        <div>
                          <span className="text-gray-500">Element:</span>{" "}
                          <span className="font-medium">
                            {selectedNode.name}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Type:</span>{" "}
                          <span className="font-medium">
                            {selectedNode.type}
                          </span>
                        </div>
                        {selectedNode.absoluteBoundingBox && (
                          <div>
                            <span className="text-gray-500">Size:</span>{" "}
                            <span className="font-medium">
                              {Math.round(
                                selectedNode.absoluteBoundingBox.width
                              )}{" "}
                              ×{" "}
                              {Math.round(
                                selectedNode.absoluteBoundingBox.height
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-gray-500">
                        Click on an element in the design to select it
                      </p>
                    )}
                  </div>

                  {selectedNode && (
                    <div className="space-y-3">
                      <Button
                        onClick={handleConfirmSelection}
                        disabled={isLoading}
                        className="w-full">
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Use This Element
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedNode(null)}
                        className="w-full">
                        Clear Selection
                      </Button>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <h5 className="mb-2 text-sm font-medium text-gray-700">
                      Instructions
                    </h5>
                    <ul className="space-y-1 text-xs text-gray-600">
                      <li>• Hover over elements to highlight them</li>
                      <li>• Click to select an element</li>
                      <li>
                        • Selected element will be extracted for comparison
                      </li>
                      <li>• Use the "Use This Element" button to confirm</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }
)

FigmaDesignSelector.displayName = "FigmaDesignSelector"

export default FigmaDesignSelector
