
import { useEffect, useState } from 'react';
import { IRenderInfo } from 'helux';
import { nodupPush } from '../logic/util';

interface IProps {
  info?: IRenderInfo | Array<IRenderInfo>;
  name?: string;
  children: any;
}

const colors = ['#0944d0', '#fc774b', '#1da187', '#fdc536', '#1789f5'];
function getColor(sn: number) {
  const idx = sn % colors.length;
  const color = colors[idx];
  return color;
}

const fakeInfo = { sn: 0, getDeps: () => ([]) };

function ensureInfos(info: IRenderInfo | Array<IRenderInfo>) {
  let infos: IRenderInfo[] = [];
  if (!Array.isArray(info)) {
    infos = [info];
  } else {
    infos = info || [];
  }
  return infos;
}

function getInfoData(info: IRenderInfo | Array<IRenderInfo>, genDepStr?: boolean) {
  const infos = ensureInfos(info);
  let sn = 0;
  let depStr = '';
  const deps: string[] = [];
  infos.forEach((item) => {
    sn += item.sn;
    if (genDepStr) {
      item.getDeps().forEach(dep => nodupPush(deps, dep));
    }
  });
  depStr = deps.join(' , ');
  return {
    sn,
    depStr,
  }
}

function useMarkUpdate(info: IRenderInfo | Array<IRenderInfo>) {
  const [depStr, setDepStr] = useState('');
  const sn = getInfoData(info).sn;
  useEffect(() => {
    setDepStr(getInfoData(info, true).depStr); // 此时调用获取到当前的渲染依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sn]);
  let snLabel = Array.isArray(info) ? 'sn sum' : 'sn';
  const snNode = sn ? `(${snLabel} ${sn})` : '';
  return { depStr, snNode, sn };
}

function Ui(props: IProps) {
  const { name = 'MarkUpdate', info = fakeInfo } = props;
  const { snNode, depStr, sn } = useMarkUpdate(info);
  return (
    <div className="box">
      {props.children}
      <div className="info" style={{ backgroundColor: getColor(sn) }}>
        [{name}] update at {new Date().toLocaleString()} {snNode}
      </div>
      {depStr && <div style={{ color: 'green' }}> deps is [ {depStr} ]</div>}
    </div>
  );
}

export function MarkUpdate(props: IProps) {
  return <Ui {...props}>{props.children}</Ui>;
}

export function MarkUpdateH1(props: IProps) {
  return <Ui {...props}><h1>{props.children}</h1></Ui>;
}

export function MarkUpdateH2(props: IProps) {
  return <Ui {...props}><h2>{props.children}</h2></Ui>;
}

export function MarkUpdateH3(props: IProps) {
  return <Ui {...props}><h3>{props.children}</h3></Ui>;
}
