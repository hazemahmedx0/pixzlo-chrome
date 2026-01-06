/**
 * Service Container
 *
 * Implements the Dependency Injection pattern to wire all services together.
 * This follows the Dependency Inversion Principle by depending on abstractions
 * and allowing easy substitution of implementations.
 *
 * The container is responsible for:
 * 1. Creating service instances with their dependencies
 * 2. Managing service lifecycle
 * 3. Providing access to services
 */

import { PIXZLO_WEB_URL } from "~lib/constants"

import { FigmaApiService } from "./figma-api-service"
import type {
  IFigmaService,
  IIssueSubmissionService,
  ILinearService,
  IMessageHandlerService,
  IScreenshotService,
  IUserProfileService,
  IWorkspaceService
} from "./interfaces"
import { IssueSubmissionService } from "./issue-submission-service"
import { LinearService } from "./linear-service"
import { MessageHandlerService } from "./message-handler-service"
import { ScreenshotService } from "./screenshot-service"
import { UserProfileService, WorkspaceService } from "./workspace-service"

/**
 * Service Container Configuration
 */
export interface ServiceContainerConfig {
  apiBaseUrl?: string
}

/**
 * Service Container Implementation
 *
 * Uses lazy initialization to create services only when needed.
 */
export class ServiceContainer {
  private readonly apiBaseUrl: string

  // Service instances (lazy initialized)
  private _userProfileService: IUserProfileService | undefined
  private _workspaceService: IWorkspaceService | undefined
  private _linearService: ILinearService | undefined
  private _figmaService: IFigmaService | undefined
  private _screenshotService: IScreenshotService | undefined
  private _issueSubmissionService: IIssueSubmissionService | undefined
  private _messageHandlerService: IMessageHandlerService | undefined

  constructor(config: ServiceContainerConfig = {}) {
    this.apiBaseUrl = config.apiBaseUrl ?? PIXZLO_WEB_URL
  }

  /**
   * Gets the User Profile Service
   */
  get userProfileService(): IUserProfileService {
    if (!this._userProfileService) {
      this._userProfileService = new UserProfileService(this.apiBaseUrl)
    }
    return this._userProfileService
  }

  /**
   * Gets the Workspace Service
   */
  get workspaceService(): IWorkspaceService {
    if (!this._workspaceService) {
      this._workspaceService = new WorkspaceService(this.userProfileService)
    }
    return this._workspaceService
  }

  /**
   * Gets the Linear Service
   */
  get linearService(): ILinearService {
    if (!this._linearService) {
      this._linearService = new LinearService(this.apiBaseUrl, this.workspaceService)
    }
    return this._linearService
  }

  /**
   * Gets the Figma Service
   */
  get figmaService(): IFigmaService {
    if (!this._figmaService) {
      this._figmaService = new FigmaApiService(this.apiBaseUrl, this.workspaceService)
    }
    return this._figmaService
  }

  /**
   * Gets the Screenshot Service
   */
  get screenshotService(): IScreenshotService {
    if (!this._screenshotService) {
      this._screenshotService = new ScreenshotService()
    }
    return this._screenshotService
  }

  /**
   * Gets the Issue Submission Service
   */
  get issueSubmissionService(): IIssueSubmissionService {
    if (!this._issueSubmissionService) {
      this._issueSubmissionService = new IssueSubmissionService(
        this.apiBaseUrl,
        this.workspaceService
      )
    }
    return this._issueSubmissionService
  }

  /**
   * Gets the Message Handler Service
   */
  get messageHandlerService(): IMessageHandlerService {
    if (!this._messageHandlerService) {
      this._messageHandlerService = new MessageHandlerService(
        this.workspaceService,
        this.linearService,
        this.figmaService,
        this.screenshotService,
        this.issueSubmissionService,
        this.apiBaseUrl
      )
    }
    return this._messageHandlerService
  }

  /**
   * Clears all cached services (useful for testing)
   */
  reset(): void {
    this._userProfileService = undefined
    this._workspaceService = undefined
    this._linearService = undefined
    this._figmaService = undefined
    this._screenshotService = undefined
    this._issueSubmissionService = undefined
    this._messageHandlerService = undefined
  }
}

/**
 * Singleton instance of the service container
 */
let containerInstance: ServiceContainer | undefined

/**
 * Gets the global service container instance
 */
export function getServiceContainer(): ServiceContainer {
  if (!containerInstance) {
    containerInstance = new ServiceContainer()
  }
  return containerInstance
}

/**
 * Creates a new service container with custom configuration
 * Useful for testing or custom environments
 */
export function createServiceContainer(config?: ServiceContainerConfig): ServiceContainer {
  return new ServiceContainer(config)
}

/**
 * Resets the global service container
 * Useful for testing
 */
export function resetServiceContainer(): void {
  if (containerInstance) {
    containerInstance.reset()
    containerInstance = undefined
  }
}

// =============================================================================
// Convenience exports for direct service access
// =============================================================================

/**
 * Gets the workspace service from the global container
 */
export function getWorkspaceService(): IWorkspaceService {
  return getServiceContainer().workspaceService
}

/**
 * Gets the linear service from the global container
 */
export function getLinearService(): ILinearService {
  return getServiceContainer().linearService
}

/**
 * Gets the figma service from the global container
 */
export function getFigmaService(): IFigmaService {
  return getServiceContainer().figmaService
}

/**
 * Gets the screenshot service from the global container
 */
export function getScreenshotService(): IScreenshotService {
  return getServiceContainer().screenshotService
}

/**
 * Gets the issue submission service from the global container
 */
export function getIssueSubmissionService(): IIssueSubmissionService {
  return getServiceContainer().issueSubmissionService
}

/**
 * Gets the message handler service from the global container
 */
export function getMessageHandlerService(): IMessageHandlerService {
  return getServiceContainer().messageHandlerService
}
