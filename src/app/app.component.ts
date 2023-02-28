import { Component, ViewChild, OnInit, Output, EventEmitter, ElementRef, AfterViewInit } from '@angular/core';
import { Subject } from 'rxjs';
import WebViewer, { WebViewerInstance } from '@pdftron/webviewer';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('viewer') viewer: ElementRef;
  wvInstance: any;
  @Output() coreControlsEvent:EventEmitter<string> = new EventEmitter(); 
  docUrl = "https://journalclub.blob.core.windows.net/journalclub-dev/Organization/1/Article/Library/0/file-example_PDF_1MB.pdf";

  private documentLoaded$: Subject<void>;

  constructor() {
    this.documentLoaded$ = new Subject<void>();
  }

  ngAfterViewInit(): void {

    WebViewer({
      path: '../lib',
      initialDoc: this.docUrl,
      fullAPI: true
    }, this.viewer.nativeElement).then(instance => {
      this.wvInstance = instance;

      this.coreControlsEvent.emit(instance.UI.LayoutMode.Single);

      const { documentViewer, Annotations, annotationManager } = instance.Core;

      instance.UI.openElements(['notesPanel']);

      documentViewer.addEventListener('annotationsLoaded', () => {
        console.log('annotations loaded');
      });

      instance.UI.setHeaderItems((header: any) => {
        var items = header.getItems();

        // save dropdown start here

        // const { docViewer } = instance;
        // const parent = docViewer.getScrollViewElement().parentElement;
        var sniptool = {
          type: 'actionButton',
          img: '../files/capture.png',
          onClick: () => {

            const tool = documentViewer.getTool(this.wvInstance.Tools.ToolNames.RECTANGLE);            
            documentViewer.setToolMode(tool);
          }
        }
        items.push(sniptool);
      })

      documentViewer.addEventListener('documentLoaded', () => {
        this.documentLoaded$.next();
        const rectangleAnnot = new Annotations.RectangleAnnotation({
          PageNumber: 1,
          // values are in page coordinates with (0, 0) in the top left
          X: 100,
          Y: 150,
          Width: 200,
          Height: 50,
          Author: annotationManager.getCurrentUser()
        });
        annotationManager.addAnnotation(rectangleAnnot);
        annotationManager.redrawAnnotation(rectangleAnnot);

        annotationManager.addEventListener('annotationChanged', (annotations: any, action: any, imported: any) => {
       
          if (action === 'add') {
            this.annotationChangedFn(annotations, action, imported);
            console.log('this is a change that added annotations');
          } else if (action === 'modify') {
            console.log('this change modified annotations');
          } else if (action === 'delete') {
            console.log('there were annotations deleted');
          }
        })  
      });
      
    })
  }

  async annotationChangedFn(annotations: any, action: any, imported: any) {
    const { documentViewer } = this.wvInstance.Core;
    const { docViewer, Annotations, Tools, iframeWindow, annotManager } = this.wvInstance;
    const document = this.wvInstance.UI.iframeWindow.document;
    // do the await things here.
    const downloadURI = (uri: any, name: any) => {
      
      const link = document.createElement("a");
      link.download = name;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    if (annotations && annotations.length > 0 && annotations[0].ToolName == 'AnnotationCreateRectangle' ) {    
      var annotation = annotations[0];
      const pageIndex = annotation.PageNumber;
      // get the canvas for the page
      const pageContainer = iframeWindow.document.getElementById('pageContainer' + pageIndex);
      const pageCanvas = pageContainer.querySelector('.canvas' + pageIndex);
      // var pageCanvas:any = iframeWindow.document.querySelector('.auxiliary');
      
      const topOffset = parseFloat(pageCanvas?.style.top) || 0;
      const leftOffset = parseFloat(pageCanvas?.style.left) || 0;
      const zoom = docViewer.getZoom();

      const x = annotation.X * zoom - leftOffset;
      const y = annotation.Y * zoom - topOffset;
      const width = annotation.Width * (zoom + 0.5);
      const height = annotation.Height * (zoom + 0.4);

      const copyCanvas = document.createElement('canvas');
      copyCanvas.width = width;
      copyCanvas.height = height;
      const ctx = copyCanvas.getContext('2d');
      // copy the image data from the page to a new canvas so we can get the data URL
      ctx.drawImage(pageCanvas, x, y, width, height, 0, 0, width, height);
      await downloadURI(copyCanvas.toDataURL(), "snippet.png");
  
      

      annotManager.deleteAnnotation(annotation);
      const tool = documentViewer.getTool(this.wvInstance.Tools.ToolNames.EDIT);
      // tool.enableImmediateActionOnAnnotationSelection();
      documentViewer.setToolMode(tool);
    }
  }

  ngOnInit() {
  }



  getDocumentLoadedObservable() {
    return this.documentLoaded$.asObservable();
  }
}
