import {
  Component,
  ViewChild,
  OnInit,
  Output,
  EventEmitter,
  ElementRef,
  AfterViewInit,
} from "@angular/core";
import { Subject } from "rxjs";
import WebViewer, { WebViewerInstance } from "@pdftron/webviewer";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild("viewer") viewer: ElementRef;
  wvInstance: WebViewerInstance;
  @Output() coreControlsEvent: EventEmitter<string> = new EventEmitter();
  private documentLoaded$: Subject<void>;

  constructor() {
    this.documentLoaded$ = new Subject<void>();
  }

  ngAfterViewInit(): void {
    WebViewer(
      {
        path: "../lib",
        initialDoc: "https://journalclub.blob.core.windows.net/journalclub-dev/Organization/1/Article/Library/0/file-example_PDF_1MB.pdf",
      },
      this.viewer.nativeElement
    ).then(async (instance) => {
      this.wvInstance = instance;
      const { documentViewer, Annotations, Tools, annotationManager } =
        instance.Core;
     let tool= new Tools.Tool(documentViewer);
     let isInSnipMode = false;
      const createSnipTool = function () {
        const SnipTool = function () {
          Tools.RectangleCreateTool.apply(this, arguments);
          this.defaults.StrokeColor = new Annotations.Color(0, 255, 0, 0.5);
          this.defaults.StrokeThickness = 2;
        };

        SnipTool.prototype = new Tools.RectangleCreateTool(documentViewer);

        return new SnipTool();
      };

      const customSnipTool = createSnipTool();

      instance.UI.registerTool({
        toolName: "SnipTool",
        toolObject: customSnipTool,
        buttonImage: "../files/capture.png",
        buttonName: "snipToolButton",
        tooltip: "Snipping Tool",
      });

      instance.UI.setHeaderItems((header) => {
        header.push({
          type: "toolButton",
          toolName: "SnipTool",
          onClick: () => {
            tool = documentViewer.getToolMode();
            isInSnipMode = true;
            const rectangleTool = documentViewer.getTool(
              this.wvInstance.Core.Tools.ToolNames.RECTANGLE
            );
            documentViewer.setToolMode(rectangleTool);
          },
        });
      });

      const downloadURI = (uri, name) => {
        const link = document.createElement("a");
        link.download = name;
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      annotationManager.addEventListener("annotationChanged", (annotations,action) => {
        if (isInSnipMode && annotations.length > 0) {
          const annotation = annotations[0];
          const pageNumber = annotation.PageNumber;

          const pageContainer = instance.UI.iframeWindow.document.getElementById('pageContainer' + pageNumber);
          const pageCanvas = pageContainer.querySelector('.canvas' + pageNumber) as HTMLElement;
          const pageCanvas2 = pageContainer.querySelector('.auxiliary') as HTMLElement;

          const scale = window.devicePixelRatio
          const topOffset = (parseFloat(pageCanvas.style.top) || 0) * scale;
          const leftOffset = (parseFloat(pageCanvas.style.left) || 0) *  scale;
          const zoom = documentViewer.getZoomLevel() * scale;

          const x = annotation.X * zoom - leftOffset;
          const y = annotation.Y * zoom - topOffset;
          const width = annotation.Width * zoom;
          const height = annotation.Height * zoom;

          const copyCanvas = document.createElement('canvas');
          copyCanvas.width = width;
          copyCanvas.height = height;
          const ctx = copyCanvas.getContext('2d');
          
          ctx.drawImage(pageCanvas as CanvasImageSource, x, y, width, height, 0, 0, width, height);
          ctx.drawImage(pageCanvas2 as CanvasImageSource, x, y, width, height, 0, 0, width, height);
          downloadURI(copyCanvas.toDataURL(), "snippet.png");

          annotationManager.deleteAnnotation(annotation);
          documentViewer.setToolMode(tool);
          isInSnipMode = false;
        }
      });

    });
  }

  ngOnInit() {}

  getDocumentLoadedObservable() {
    return this.documentLoaded$.asObservable();
  }
}
