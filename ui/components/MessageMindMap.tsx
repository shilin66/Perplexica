import React, { useEffect, useRef, useState } from 'react';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';
import {
  Download,
  ListTree,
  Maximize,
  Minimize,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import Markdown from 'markdown-to-jsx';
import { cn } from '@/lib/utils';
import { Tooltip } from 'antd';
import { MindMapIcon } from '@/components/icon/MindMapIcon';

const MindMap = ({
  markdown,
  generated,
}: {
  markdown: string;
  generated?: boolean;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const mmRef = useRef<ReturnType<typeof Markmap.create> | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const transformer = new Transformer();
  const { root } = transformer.transform(markdown);
  const [showWay, setShowWay] = useState('mindMap');
  const containerRef = useRef<HTMLDivElement | null>(null);
  // const { scripts, styles } = transformer.getAssets();
  // 加载样式和脚本
  // useEffect(() => {
  //   if (styles) loadCSS(styles);
  //   if (scripts) loadJS(scripts);
  // }, [styles, scripts]);
  // 创建 Markmap 实例
  useEffect(() => {
    if (svgRef.current && showWay === 'mindMap' && generated) {
      mmRef.current = Markmap.create(svgRef.current);
      mmRef.current.setData(root);
      mmRef.current.fit();
    }
  }, [markdown, isExpanded, showWay]); // 监听 isExpanded 状态

  useEffect(() => {
    if (generated) {
      setShowWay('mindMap');
    } else {
      setShowWay('markdown');
    }
  }, [generated]);

  useEffect(() => {
    if (containerRef.current) {
      // 只有当`markdown`内容增加时，才自动滚动
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [markdown]);

  // 展开事件处理函数
  const handleExpandClick = () => {
    setIsExpanded(true);
    document.body.style.overflow = 'hidden';
  };

  // 关闭事件处理函数
  const handleCloseClick = () => {
    setIsExpanded(false);
    document.body.style.overflow = 'auto';
  };
  // 下载功能实现
  const handleDownloadClick = () => {
    if (svgRef.current) {
      const svgWidth = svgRef.current.clientWidth;
      const svgHeight = svgRef.current.clientHeight;
      const scale = isExpanded ? 2 : 4; // 放大两倍
      const canvasWidth = svgWidth * scale;
      const canvasHeight = svgHeight * scale;
      const transform = `scale(${scale}) translate(-50%, -50%)`;

      // 创建一个临时div元素用于渲染
      const div = document.createElement('div');
      div.style.width = `${canvasWidth}px`;
      div.style.height = `${canvasHeight}px`;
      div.style.position = 'relative';
      div.style.left = '50%';
      div.style.top = '50%';
      div.style.transform = transform;
      div.style.transformOrigin = 'center center';
      div.style.margin = 'auto';
      div.appendChild(svgRef.current.cloneNode(true));
      document.body.appendChild(div);

      html2canvas(div, {
        width: canvasWidth,
        height: canvasHeight,
        useCORS: true,
        logging: true,
      }).then((canvas) => {
        canvas.toBlob((blob) => {
          if (!blob) return;
          saveAs(blob, 'mindmap.png');
        });
      });
    }
  };
  return (
    <>
      {isExpanded ? (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50  z-50"
          style={{ width: '100vw', height: '100vh' }}
        >
          <div className="relative w-full h-full bg-white">
            <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
            <div
              className="flex items-center justify-end absolute bottom-10 right-10"
              style={{
                width: '100%',
                height: '50px',
                paddingRight: '10px',
                gap: '10px',
              }}
            >
              <Minus
                className="cursor-pointer"
                onClick={() => mmRef.current?.rescale(0.8)}
              />
              <Plus
                className="cursor-pointer"
                onClick={() => mmRef.current?.rescale(1.2)}
              />
              <Minimize
                className="cursor-pointer"
                onClick={() => mmRef.current?.fit()}
              />
              <Download
                className="cursor-pointer"
                onClick={handleDownloadClick}
              />
            </div>
            <X
              className="absolute top-2 right-2 cursor-pointer"
              onClick={handleCloseClick}
            />
          </div>
        </div>
      ) : (
        <div
          className="flex flex-row justify-center border border-dashed border-light-200 dark:border-dark-200"
          style={{ width: '100%', height: '500px', position: 'relative' }}
        >
          {showWay === 'mindMap' ? (
            <svg ref={svgRef} style={{ width: '100%', height: '450px' }} />
          ) : (
            <div
              ref={containerRef}
              className="overflow-y-scroll overflow-hidden-scrollable"
              style={{
                width: '100%',
                height: '450px',
                position: 'relative',
              }}
            >
              <Markdown
                className={cn(
                  'prose prose-sm leading-snug',
                  'dark:prose-invert max-w-none break-words',
                  'text-black dark:text-white font-mono',
                  'space-y-0',
                  'prose-headings:text-sm prose-headings:leading-snug',
                  'indent-headings',
                )}
              >
                {markdown}
              </Markdown>
            </div>
          )}
          <div
            className="flex items-center justify-end absolute bottom-0 border-t border-dashed border-light-200 dark:border-dark-200"
            style={{
              width: '100%',
              height: '50px',
              paddingRight: '10px',
              gap: '10px',
            }}
          >
            <div className="absolute left-0 ml-2">
              {showWay === 'mindMap' ? (
                <Tooltip className="cursor-pointer" title="切换到大纲视图">
                  <ListTree onClick={() => setShowWay('markdown')} />
                </Tooltip>
              ) : (
                <Tooltip className="cursor-pointer" title="切换到思维导图">
                  <MindMapIcon onClick={() => setShowWay('mindMap')} />
                </Tooltip>
              )}
            </div>
            {showWay === 'mindMap' && (
              <>
                <Minus
                  className="cursor-pointer"
                  onClick={() => mmRef.current?.rescale(0.8)}
                />
                <Plus
                  className="cursor-pointer"
                  onClick={() => mmRef.current?.rescale(1.2)}
                />
                <Minimize
                  className="cursor-pointer"
                  onClick={() => mmRef.current?.fit()}
                />
                <Maximize
                  className="cursor-pointer"
                  onClick={handleExpandClick}
                />
                <Download
                  className="cursor-pointer"
                  onClick={handleDownloadClick}
                />
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default MindMap;
